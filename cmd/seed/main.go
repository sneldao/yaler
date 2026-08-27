package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/sneldao/yaler/internal/domain"
	"github.com/sneldao/yaler/internal/store"
)

// missionSeed bundles a mission with everything that makes its detail page
// worth opening during a demo: the timeline events that carried it to its
// current state, the supplier quotes it is weighing (or weighed), and — for
// completed jobs — the proof receipt and the buyer's rating.
type missionSeed struct {
	Mission  *domain.Mission         `json:"mission"`
	Events   []*domain.Event         `json:"events"`
	Offers   []*domain.Offer         `json:"offers"`
	Receipt  *domain.ProofReceipt    `json:"receipt,omitempty"`
	Feedback *domain.MissionFeedback `json:"feedback,omitempty"`
}

func main() {
	ctx := context.Background()

	suppliers := readSuppliers("seed/suppliers.json")
	missions := readMissionSeeds("seed/missions.json")

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

	seeded := 0
	for _, bundle := range missions {
		if err := seedMission(ctx, st, bundle); err != nil {
			log.Printf("Error seeding mission bundle: %v", err)
			continue
		}
		seeded++
	}
	if len(missions) > 0 {
		log.Printf("Mission seeding complete! %d/%d demo missions written.", seeded, len(missions))
	}
}

func readSuppliers(filePath string) []*domain.Supplier {
	data, err := os.ReadFile(filePath)
	if err != nil {
		log.Fatalf("Failed to read seed file %s: %v", filePath, err)
	}

	var suppliers []*domain.Supplier
	if err := json.Unmarshal(data, &suppliers); err != nil {
		log.Fatalf("Failed to parse supplier seed JSON: %v", err)
	}
	return suppliers
}

// readMissionSeeds loads the demo-mission bundles. A missing file is not
// fatal — supplier seeding must keep working on its own — but a malformed
// file is, since that always means a broken edit.
func readMissionSeeds(filePath string) []*missionSeed {
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("No mission seed file at %s — skipping mission seeding", filePath)
			return nil
		}
		log.Fatalf("Failed to read seed file %s: %v", filePath, err)
	}

	var bundles []*missionSeed
	if err := json.Unmarshal(data, &bundles); err != nil {
		log.Fatalf("Failed to parse mission seed JSON: %v", err)
	}
	return bundles
}

// seedMission writes one demo mission plus its events, offers, receipt and
// feedback. All IDs are fixed strings in seed/missions.json, so re-running
// the seed overwrites the demo data rather than duplicating it.
func seedMission(ctx context.Context, st store.Store, bundle *missionSeed) error {
	m := bundle.Mission
	if m == nil || m.ID == "" {
		return errors.New("bundle has no mission id — skipping")
	}

	if err := upsertMission(ctx, st, m); err != nil {
		return fmt.Errorf("mission %s: %w", m.ID, err)
	}

	for _, evt := range bundle.Events {
		if evt == nil {
			continue
		}
		if err := st.RecordEvent(ctx, evt); err != nil {
			return fmt.Errorf("mission %s event %s: %w", m.ID, evt.ID, err)
		}
	}
	for _, offer := range bundle.Offers {
		if offer == nil {
			continue
		}
		if err := st.SaveOffer(ctx, offer); err != nil {
			return fmt.Errorf("mission %s offer %s: %w", m.ID, offer.ID, err)
		}
	}
	if bundle.Receipt != nil {
		if err := st.SaveProofReceipt(ctx, bundle.Receipt); err != nil {
			return fmt.Errorf("mission %s receipt: %w", m.ID, err)
		}
	}
	if bundle.Feedback != nil {
		if err := st.SaveMissionFeedback(ctx, bundle.Feedback); err != nil {
			return fmt.Errorf("mission %s feedback: %w", m.ID, err)
		}
	}

	fmt.Printf("Successfully seeded mission: %s — %s (%d events, %d offers)\n",
		m.ID, m.Status, len(bundle.Events), len(bundle.Offers))
	return nil
}

// upsertMission creates the mission, or overwrites it when the fixed seed ID
// already exists. CreateMission rejects existing IDs and UpdateMission demands
// a strictly higher version, so the overwrite path reads the stored version
// and writes one higher — re-running the seed is always safe.
func upsertMission(ctx context.Context, st store.Store, m *domain.Mission) error {
	err := st.CreateMission(ctx, m)
	if err == nil {
		return nil
	}
	if !errors.Is(err, store.ErrConflict) {
		return err
	}
	existing, getErr := st.GetMission(ctx, m.ID)
	if getErr != nil {
		return fmt.Errorf("read before overwrite: %w", getErr)
	}
	m.Version = existing.Version + 1
	return st.UpdateMission(ctx, m)
}
