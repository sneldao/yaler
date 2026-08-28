package gemini_test

import (
	"context"
	"testing"

	"github.com/sneldao/yaler/internal/domain"
	"github.com/sneldao/yaler/internal/gemini"
)

func TestDiagnosticFallbackFixtures(t *testing.T) {
	client, err := gemini.NewClient(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name string
		goal string
		want string
	}{
		{"temperature report", "Freezer is at 6 degrees in N1", "Reported temperature"},
		{"fault code report", "Display shows error code E4", "Fault code mentioned"},
		{"unstructured report", "The unit is making a clicking noise", ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			brief, err := client.ExtractDiagnosticBrief(context.Background(), tc.goal, domain.Mandate{})
			if err != nil {
				t.Fatal(err)
			}
			if tc.want == "" {
				if len(brief.ExtractedSignals) != 0 {
					t.Fatalf("expected no unsupported signal, got %+v", brief.ExtractedSignals)
				}
				return
			}
			if len(brief.ExtractedSignals) != 1 || brief.ExtractedSignals[0].Label != tc.want {
				t.Fatalf("expected bounded signal %q, got %+v", tc.want, brief.ExtractedSignals)
			}
			if brief.ExtractedSignals[0].Source != "manager_report" || brief.ExtractedSignals[0].Confidence != "reported" {
				t.Fatalf("expected source/confidence labels, got %+v", brief.ExtractedSignals[0])
			}
		})
	}
}
