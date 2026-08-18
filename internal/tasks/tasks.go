package tasks

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/sneldao/yaler/internal/domain"
)

// Client defines the interface for enqueueing mission execution tasks.
type Client interface {
	EnqueueTask(ctx context.Context, payload domain.TaskPayload) error
}

// LocalDirectClient calls the worker step endpoint directly via HTTP (used for local dev/demo).
type LocalDirectClient struct {
	workerURL  string
	httpClient *http.Client
}

// NewLocalDirectClient creates a LocalDirectClient targeting workerURL.
func NewLocalDirectClient(workerURL string) *LocalDirectClient {
	if workerURL == "" {
		workerURL = "http://localhost:8081/api/worker/step"
	}
	return &LocalDirectClient{
		workerURL:  workerURL,
		httpClient: &http.Client{},
	}
}

// EnqueueTask executes a task step asynchronously in a goroutine for fast local dev.
func (c *LocalDirectClient) EnqueueTask(ctx context.Context, payload domain.TaskPayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal task payload: %w", err)
	}

	go func(b []byte, id string, step string) {
		req, err := http.NewRequest("POST", c.workerURL, bytes.NewBuffer(b))
		if err != nil {
			log.Printf("[LocalTaskClient] failed to create request for mission %s step %s: %v", id, step, err)
			return
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Idempotency-Key", payload.IdempotencyKey)

		resp, err := c.httpClient.Do(req)
		if err != nil {
			log.Printf("[LocalTaskClient] task execution failed for mission %s step %s: %v", id, step, err)
			return
		}
		defer func() { _ = resp.Body.Close() }()

		if resp.StatusCode >= 400 {
			log.Printf("[LocalTaskClient] task step returned error status %d for mission %s step %s", resp.StatusCode, id, step)
		} else {
			log.Printf("[LocalTaskClient] task step %s completed successfully for mission %s", step, id)
		}
	}(body, payload.MissionID, payload.StepID)

	return nil
}
