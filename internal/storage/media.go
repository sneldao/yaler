package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"cloud.google.com/go/storage"
)

// MediaStore stores and retrieves private user-uploaded media by object key.
type MediaStore interface {
	Save(ctx context.Context, key, contentType string, src io.Reader) error
	Open(ctx context.Context, key string) (io.ReadCloser, string, error)
}

// LocalStore is the development/test implementation.
type LocalStore struct{ Root string }

func (s *LocalStore) Save(_ context.Context, key, _ string, src io.Reader) error {
	path, err := safePath(s.Root, key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, src)
	return err
}

func (s *LocalStore) Open(_ context.Context, key string) (io.ReadCloser, string, error) {
	path, err := safePath(s.Root, key)
	if err != nil {
		return nil, "", err
	}
	f, err := os.Open(path)
	if err != nil {
		return nil, "", err
	}
	return f, "", nil
}

// GCSStore stores media in a private Cloud Storage bucket using application
// default credentials supplied by the Cloud Run service identity.
type GCSStore struct{ Bucket *storage.BucketHandle }

func NewGCSStore(ctx context.Context, bucketName string) (*GCSStore, error) {
	if strings.TrimSpace(bucketName) == "" {
		return nil, fmt.Errorf("media bucket name is empty")
	}
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("create storage client: %w", err)
	}
	return &GCSStore{Bucket: client.Bucket(bucketName)}, nil
}

func (s *GCSStore) Save(ctx context.Context, key, contentType string, src io.Reader) error {
	w := s.Bucket.Object(key).NewWriter(ctx)
	w.ContentType = contentType
	if _, err := io.Copy(w, src); err != nil {
		_ = w.Close()
		return err
	}
	return w.Close()
}

func (s *GCSStore) Open(ctx context.Context, key string) (io.ReadCloser, string, error) {
	r, err := s.Bucket.Object(key).NewReader(ctx)
	if err != nil {
		return nil, "", err
	}
	return r, r.ContentType(), nil
}

func safePath(root, key string) (string, error) {
	clean := filepath.Clean(key)
	if clean == "." || filepath.IsAbs(clean) || clean == ".." || strings.HasPrefix(clean, ".."+string(os.PathSeparator)) {
		return "", fmt.Errorf("invalid media key")
	}
	return filepath.Join(root, clean), nil
}
