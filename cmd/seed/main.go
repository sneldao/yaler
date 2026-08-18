package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/sneldao/yaler/internal/domain"
	"github.com/sneldao/yaler/internal/store"
)

func main() {
	ctx := context.Background()

	filePath := "seed/suppliers.json"
	data, err := os.ReadFile(filePath)
	if err != nil {
		log.Fatalf("Failed to read seed file %s: %v", filePath, err)
	}

	var suppliers []*domain.Supplier
	if err := json.Unmarshal(data, &suppliers); err != nil {
		log.Fatalf("Failed to parse supplier seed JSON: %v", err)
	}

	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		projectID = "yaler-dev"
	}

	st, err := store.NewFirestoreStore(ctx, projectID)
	if err != nil {
		log.Fatalf("Failed to connect to Firestore (is emulator running on FIRESTORE_EMULATOR_HOST?): %v", err)
	}
	defer func() {
		if err := st.Close(); err != nil {
			log.Printf("warning: closing store: %v", err)
		}
	}()

	for _, sup := range suppliers {
		if err := st.SaveSupplier(ctx, sup); err != nil {
			log.Printf("Error seeding supplier %s (%s): %v", sup.ID, sup.DisplayName, err)
		} else {
			fmt.Printf("Successfully seeded supplier: %s — %s\n", sup.ID, sup.DisplayName)
		}
	}

	log.Println("Supplier seeding complete!")
}
