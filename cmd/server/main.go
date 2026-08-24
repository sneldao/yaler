package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/sneldao/yaler/internal/domain"
	"github.com/sneldao/yaler/internal/gemini"
	"github.com/sneldao/yaler/internal/handler"
	"github.com/sneldao/yaler/internal/policy"
	"github.com/sneldao/yaler/internal/store"
	"github.com/sneldao/yaler/internal/tasks"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		projectID = "yaler-dev"
	}

	// 1. Initialize Store (MemoryStore by default for instant dev, or Firestore if configured)
	var st store.Store
	if os.Getenv("FIRESTORE_EMULATOR_HOST") != "" || os.Getenv("USE_FIRESTORE") == "true" {
		fsStore, err := store.NewFirestoreStore(ctx, projectID)
		if err == nil {
			log.Println("[Server] Connected to Firestore store.")
			st = fsStore
			defer func() {
				if err := fsStore.Close(); err != nil {
					log.Printf("[Server] warning: closing Firestore: %v", err)
				}
			}()
		} else {
			log.Printf("[Server] Firestore connection failed (%v). Falling back to MemoryStore...", err)
			st = store.NewMemoryStore()
		}
	} else {
		log.Println("[Server] Using thread-safe in-memory Store.")
		st = store.NewMemoryStore()
	}

	// Auto-seed default suppliers if store is empty
	seedDefaultSuppliers(ctx, st)

	// 2. Initialize Policy Engine
	pe := policy.NewEngine()

	// 3. Initialize Gemini Client
	gc, err := gemini.NewClient(ctx)
	if err != nil {
		log.Fatalf("[Server] Failed to initialize Gemini client: %v", err)
	}

	// 4. Initialize Task Client
	//    Local dev (CLOUD_TASKS_EMULATOR=true, or unset) uses the in-process
	//    direct client. Production (CLOUD_TASKS_EMULATOR=false) enqueues on a
	//    real Cloud Tasks queue so mission steps survive across requests and
	//    scale-to-zero — a sourcing mission can wait for a real quote and
	//    resume when the concierge enters one.
	var tc tasks.Client
	if os.Getenv("CLOUD_TASKS_EMULATOR") == "false" {
		cq, err := tasks.NewCloudTasksClient(ctx)
		if err != nil {
			log.Fatalf("[Server] Cloud Tasks client init failed: %v", err)
		}
		defer func() {
			if err := cq.Close(); err != nil {
				log.Printf("[Server] warning: closing cloud tasks client: %v", err)
			}
		}()
		tc = cq
		log.Println("[Server] Using Cloud Tasks queue.")
	} else {
		workerURL := fmt.Sprintf("http://localhost:%s/api/worker/step", port)
		tc = tasks.NewLocalDirectClient(workerURL)
		log.Println("[Server] Using local direct task client (CLOUD_TASKS_EMULATOR).")
	}

	// 5. Initialize Handler
	h := handler.NewHandler(st, pe, gc, tc)

	// Concierge sweeper: periodically escalate sourcing missions whose
	// callouts all declined or expired without a single quote (FR-6). An
	// in-process ticker is honest for the current single-instance shape;
	// swap for a Cloud Tasks cron when the durable queue lands.
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				h.SweepStalledSourcing(ctx)
			}
		}
	}()

	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	// Wrap with CORS middleware
	corsHandler := enableCORS(mux)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      corsHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("Yaler Mission Gateway listening on http://localhost:%s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-shutdown
	log.Println("Shutting down Yaler server gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Graceful shutdown failed: %v", err)
	}

	log.Println("Server stopped.")
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func seedDefaultSuppliers(ctx context.Context, st store.Store) {
	sups, _ := st.ListSuppliers(ctx)
	if len(sups) > 0 {
		return
	}

	data, err := os.ReadFile("seed/suppliers.json")
	if err != nil {
		log.Printf("[Server] Warning: could not read seed/suppliers.json: %v", err)
		return
	}

	var seeds []*domain.Supplier
	if err := json.Unmarshal(data, &seeds); err != nil {
		log.Printf("[Server] Warning: could not parse seed JSON: %v", err)
		return
	}

	for _, s := range seeds {
		_ = st.SaveSupplier(ctx, s)
	}
	log.Printf("[Server] Auto-seeded %d synthetic supplier profiles.", len(seeds))
}
