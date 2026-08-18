package discovery

import (
	"context"
	"testing"
)

func TestCheckCredentialFailsClosedWithoutKey(t *testing.T) {
	d := &DiscoveryService{}
	got := d.CheckCredential(context.Background(), "London Rapid ColdCare")
	if got.Status != "not_checked" {
		t.Fatalf("expected not_checked, got %q", got.Status)
	}
}

func TestCheckCredentialFailsClosedOnEmptyName(t *testing.T) {
	d := &DiscoveryService{apifyKey: "dummy"}
	got := d.CheckCredential(context.Background(), "   ")
	if got.Status != "not_checked" {
		t.Fatalf("expected not_checked, got %q", got.Status)
	}
}
