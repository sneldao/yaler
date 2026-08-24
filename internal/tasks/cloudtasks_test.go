package tasks

import (
	"context"
	"testing"
)

// NewCloudTasksClient is fail-loud: production must declare its queue and
// target. Missing either is a configuration error, not a silent fallback.
func TestNewCloudTasksClient_RequiresConfig(t *testing.T) {
	t.Setenv("CLOUD_TASKS_QUEUE", "")
	t.Setenv("CLOUD_TASKS_TARGET", "")
	t.Setenv("CLOUD_TASKS_AUDIENCE", "")

	if _, err := NewCloudTasksClient(context.Background()); err == nil {
		t.Fatalf("expected an error when CLOUD_TASKS_QUEUE is unset, got nil")
	}

	t.Setenv("CLOUD_TASKS_QUEUE", "projects/p/locations/r/queues/q")
	t.Setenv("CLOUD_TASKS_TARGET", "")
	if _, err := NewCloudTasksClient(context.Background()); err == nil {
		t.Fatalf("expected an error when CLOUD_TASKS_TARGET is unset, got nil")
	}
}

// serviceRoot extracts the Cloud Run service root from a worker target URL.
func TestServiceRoot(t *testing.T) {
	cases := map[string]string{
		"https://yaler-backend-abc.run.app/api/worker/step": "https://yaler-backend-abc.run.app",
		"https://yaler-backend-abc.run.app":                 "https://yaler-backend-abc.run.app",
		"https://yaler-backend-abc.run.app/api/worker":      "https://yaler-backend-abc.run.app",
	}
	for in, want := range cases {
		if got := serviceRoot(in); got != want {
			t.Errorf("serviceRoot(%q) = %q, want %q", in, got, want)
		}
	}
}
