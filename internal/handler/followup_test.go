package handler

import (
	"testing"

	"github.com/sneldao/yaler/internal/domain"
)

func TestDiagnosticFollowUpRulesAreBounded(t *testing.T) {
	requests := diagnosticFollowUps([]domain.DiagnosticMedia{{Kind: "unit"}}, nil)
	if len(requests) > 2 {
		t.Fatalf("follow-up requests must be capped at two, got %d", len(requests))
	}
	for _, request := range requests {
		if !request.Requested || request.Completed {
			t.Fatalf("new follow-up request must be requested and incomplete: %+v", request)
		}
	}
}

func TestDiagnosticFollowUpCompletionIsRepresentable(t *testing.T) {
	request := domain.DiagnosticFollowUpRequest{
		Kind: "display", Reason: "readable code", Requested: true, Completed: true,
	}
	if !request.Requested || !request.Completed {
		t.Fatalf("completed follow-up state was not represented: %+v", request)
	}
}
