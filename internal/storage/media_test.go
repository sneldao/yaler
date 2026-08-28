package storage

import (
	"context"
	"strings"
	"testing"
)

func TestLocalStoreRejectsPathTraversal(t *testing.T) {
	store := &LocalStore{Root: t.TempDir()}
	if err := store.Save(context.Background(), "../outside.jpg", "image/jpeg", strings.NewReader("x")); err == nil {
		t.Fatal("expected path traversal key to be rejected")
	}
}

func TestLocalStoreSaveOpenDelete(t *testing.T) {
	store := &LocalStore{Root: t.TempDir()}
	ctx := context.Background()
	if err := store.Save(ctx, "photo.jpg", "image/jpeg", strings.NewReader("image bytes")); err != nil {
		t.Fatalf("save failed: %v", err)
	}
	reader, _, err := store.Open(ctx, "photo.jpg")
	if err != nil {
		t.Fatalf("open failed: %v", err)
	}
	_ = reader.Close()
	if err := store.Delete(ctx, "photo.jpg"); err != nil {
		t.Fatalf("delete failed: %v", err)
	}
	if _, _, err := store.Open(ctx, "photo.jpg"); err == nil {
		t.Fatal("expected deleted media to be unavailable")
	}
}
