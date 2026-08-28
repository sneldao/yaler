package handler_test

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"testing"

	"github.com/sneldao/yaler/internal/handler"
	"github.com/sneldao/yaler/internal/policy"
	"github.com/sneldao/yaler/internal/store"
	"github.com/sneldao/yaler/internal/tasks"
)

func TestFileUpload(t *testing.T) {
	st := store.NewMemoryStore()
	pe := policy.NewEngine()
	tc := tasks.NewLocalDirectClient("http://localhost:8081/api/worker/step")
	h := handler.NewHandler(st, pe, nil, tc)

	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreatePart(textproto.MIMEHeader{
		"Content-Disposition": {`form-data; name="file"; filename="test_proof.jpg"`},
		"Content-Type":        {"image/jpeg"},
	})
	if err != nil {
		t.Fatalf("failed to create multipart form file: %v", err)
	}
	_, _ = part.Write([]byte("fake image data bytes"))
	_ = writer.Close()

	req := httptest.NewRequest("POST", "/api/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200 on upload, got %d", rec.Code)
	}
}
