package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/sneldao/yaler/internal/domain"
	"github.com/sneldao/yaler/internal/handler"
	"github.com/sneldao/yaler/internal/policy"
	"github.com/sneldao/yaler/internal/storage"
	"github.com/sneldao/yaler/internal/store"
	"github.com/sneldao/yaler/internal/tasks"
)

func TestMediaAccessRequiresOpsTokenWhenConfigured(t *testing.T) {
	t.Setenv("OPS_TOKEN", "secret")
	st := store.NewMemoryStore()
	h := handler.NewHandler(st, policy.NewEngine(), nil, tasks.NewLocalDirectClient("http://localhost:8081/api/worker/step"))
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	body := bytes.NewBufferString(`{"missionId":"missing","objectKey":"photo.jpg"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/media/access", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without token, got %d", rec.Code)
	}
}

func TestMediaAccessIssuesViewerToken(t *testing.T) {
	t.Setenv("OPS_TOKEN", "media-secret")
	st := store.NewMemoryStore()
	now := time.Now().UTC()
	mission := &domain.Mission{ID: "m_media", Status: domain.StatusDraft, Version: 1, CreatedAt: now, UpdatedAt: now, DiagnosticBrief: domain.DiagnosticBrief{DiagnosticMedia: []domain.DiagnosticMedia{{Kind: "display", Label: "Display", URL: "/uploads/photo.jpg", ObjectKey: "photo.jpg", MimeType: "image/jpeg"}}}}
	if err := st.CreateMission(context.Background(), mission); err != nil {
		t.Fatal(err)
	}
	h := handler.NewHandler(st, policy.NewEngine(), nil, tasks.NewLocalDirectClient("http://localhost:8081/api/worker/step"))
	media := &storage.LocalStore{Root: t.TempDir()}
	if err := media.Save(context.Background(), "photo.jpg", "image/jpeg", bytes.NewBufferString("image-data")); err != nil {
		t.Fatal(err)
	}
	h.SetMediaStore(media)
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	body := bytes.NewBufferString(`{"missionId":"m_media","objectKey":"photo.jpg"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/media/access", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Ops-Token", "media-secret")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var access struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &access); err != nil {
		t.Fatal(err)
	}
	if access.URL == "" {
		t.Fatal("expected viewer URL")
	}

	serveReq := httptest.NewRequest(http.MethodGet, access.URL, nil)
	serveRec := httptest.NewRecorder()
	mux.ServeHTTP(serveRec, serveReq)
	if serveRec.Code != http.StatusOK || serveRec.Body.String() != "image-data" {
		t.Fatalf("expected protected media body, got status=%d body=%q", serveRec.Code, serveRec.Body.String())
	}
}
