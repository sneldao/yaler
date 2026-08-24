package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	cloudtasks "cloud.google.com/go/cloudtasks/apiv2"
	cloudtaskspb "cloud.google.com/go/cloudtasks/apiv2/cloudtaskspb"
	"github.com/sneldao/yaler/internal/domain"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// CloudTasksClient enqueues mission worker steps on a real Cloud Tasks
// queue. It is the production transport: the task survives the enqueueing
// request, is retried with backoff by Cloud Tasks on failure, and wakes the
// worker on a separate request — so a mission can wait in SOURCING for a
// real quote and resume when the concierge enters one. Local dev uses
// LocalDirectClient; the switch lives in cmd/server.
type CloudTasksClient struct {
	client    *cloudtasks.Client
	queuePath string // projects/PROJECT/locations/REGION/queues/QUEUE
	targetURL string // https://yaler-backend-...run.app/api/worker/step
	audience  string // the Cloud Run service URL, used as the OIDC audience
}

// NewCloudTasksClient builds a production task client. It reads the queue
// path and target from env so the deploy stays declarative:
//   - CLOUD_TASKS_QUEUE   projects/P/locations/R/queues/Q
//   - CLOUD_TASKS_TARGET  https://<service>.run.app/api/worker/step
//   - CLOUD_TASKS_AUDIENCE defaults to the service root URL if unset
//
// Returns an error if the queue path is missing — production must declare
// its queue; this is a fail-loud guard against silently falling back.
func NewCloudTasksClient(ctx context.Context) (*CloudTasksClient, error) {
	queuePath := os.Getenv("CLOUD_TASKS_QUEUE")
	if queuePath == "" {
		return nil, fmt.Errorf("CLOUD_TASKS_QUEUE not set (expected projects/PROJECT/locations/REGION/queues/QUEUE)")
	}
	targetURL := os.Getenv("CLOUD_TASKS_TARGET")
	if targetURL == "" {
		return nil, fmt.Errorf("CLOUD_TASKS_TARGET not set (expected https://<service>.run.app/api/worker/step)")
	}
	audience := os.Getenv("CLOUD_TASKS_AUDIENCE")
	if audience == "" {
		// The OIDC audience for a Cloud Run invoker is the service root URL.
		audience = serviceRoot(targetURL)
	}

	c, err := cloudtasks.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create cloud tasks client: %w", err)
	}
	return &CloudTasksClient{
		client:    c,
		queuePath: queuePath,
		targetURL: targetURL,
		audience:  audience,
	}, nil
}

// EnqueueTask creates a Cloud Tasks task that POSTs the payload to the
// worker endpoint with an OIDC ID token. The task body is the JSON
// TaskPayload; the idempotency key is carried in both the body and the
// X-Idempotency-Key header so the worker's dedupe path works on both
// transports.
//
// Retry/backoff is delegated to Cloud Tasks via the queue's config. The
// schedule time is "now" — Cloud Tasks dispatches immediately. A task is
// safe to retry because the worker checks ExpectedVersion and idempotency.
func (c *CloudTasksClient) EnqueueTask(ctx context.Context, payload domain.TaskPayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal task payload: %w", err)
	}

	req := &cloudtaskspb.CreateTaskRequest{
		Parent: c.queuePath,
		Task: &cloudtaskspb.Task{
			ScheduleTime: timestamppb.Now(),
			MessageType: &cloudtaskspb.Task_HttpRequest{
				HttpRequest: &cloudtaskspb.HttpRequest{
					HttpMethod: cloudtaskspb.HttpMethod_POST,
					Url:        c.targetURL,
					Headers: map[string]string{
						"Content-Type":      "application/json",
						"X-Idempotency-Key": payload.IdempotencyKey,
					},
					Body: body,
					AuthorizationHeader: &cloudtaskspb.HttpRequest_OidcToken{
						OidcToken: &cloudtaskspb.OidcToken{
							// Empty service account => the Cloud Run service's
							// runtime service account (the invoker). Set
							// CLOUD_TASKS_SA to a specific SA if you prefer.
							ServiceAccountEmail: os.Getenv("CLOUD_TASKS_SA"),
							Audience:            c.audience,
						},
					},
				},
			},
		},
	}

	created, err := c.client.CreateTask(ctx, req)
	if err != nil {
		log.Printf("[CloudTasks] failed to enqueue %s for mission %s: %v", payload.StepID, payload.MissionID, err)
		return fmt.Errorf("failed to create task: %w", err)
	}
	log.Printf("[CloudTasks] enqueued %s for mission %s (name=%s)", payload.StepID, payload.MissionID, created.Name)
	return nil
}

// Close releases the underlying gRPC client.
func (c *CloudTasksClient) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}

// serviceRoot returns the Cloud Run service root URL from a worker target
// URL, used as the default OIDC audience.
func serviceRoot(targetURL string) string {
	// crude but correct for *.run.app targets: strip everything after the
	// host. A misconfigured target still fails closed at invocation time.
	if i := indexOfN(targetURL, '/', 3); i >= 0 {
		return targetURL[:i]
	}
	return targetURL
}

// indexOfN returns the index of the n-th occurrence of b in s, or -1.
func indexOfN(s string, b byte, n int) int {
	count := 0
	for i := 0; i < len(s); i++ {
		if s[i] == b {
			count++
			if count == n {
				return i
			}
		}
	}
	return -1
}

// compile-time guard: CloudTasksClient satisfies the Client interface.
var _ Client = (*CloudTasksClient)(nil)

// maxDispatchDeadline mirrors the local client's hint; Cloud Tasks uses the
// queue config, this is kept for symmetry and future dispatch scheduling.
const maxDispatchDeadline = 5 * time.Minute
