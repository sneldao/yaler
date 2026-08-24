package store

import (
	"context"
	"fmt"
	"strings"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"

	"github.com/sneldao/yaler/internal/domain"
)

// FirestoreStore implements Store using Google Cloud Firestore.
type FirestoreStore struct {
	client *firestore.Client
}

// NewFirestoreStore initializes a FirestoreStore client.
func NewFirestoreStore(ctx context.Context, projectID string, opts ...option.ClientOption) (*FirestoreStore, error) {
	if projectID == "" {
		projectID = "yaler-dev"
	}
	client, err := firestore.NewClient(ctx, projectID, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create firestore client: %w", err)
	}
	return &FirestoreStore{client: client}, nil
}

// Close closes the Firestore client.
func (s *FirestoreStore) Close() error {
	return s.client.Close()
}

func (s *FirestoreStore) CreateMission(ctx context.Context, m *domain.Mission) error {
	docRef := s.client.Collection("missions").Doc(m.ID)
	err := s.client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		_, err := tx.Get(docRef)
		if err == nil {
			return ErrConflict
		}
		return tx.Set(docRef, m)
	})
	return err
}

func (s *FirestoreStore) GetMission(ctx context.Context, id string) (*domain.Mission, error) {
	doc, err := s.client.Collection("missions").Doc(id).Get(ctx)
	if err != nil {
		return nil, ErrNotFound
	}
	var m domain.Mission
	if err := doc.DataTo(&m); err != nil {
		return nil, fmt.Errorf("failed to decode mission: %w", err)
	}
	return &m, nil
}

func (s *FirestoreStore) UpdateMission(ctx context.Context, m *domain.Mission) error {
	docRef := s.client.Collection("missions").Doc(m.ID)
	return s.client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(docRef)
		if err != nil {
			return ErrNotFound
		}
		var current domain.Mission
		if err := doc.DataTo(&current); err != nil {
			return err
		}
		if current.Version >= m.Version {
			return ErrConflict
		}
		return tx.Set(docRef, m)
	})
}

func (s *FirestoreStore) ListMissions(ctx context.Context) ([]*domain.Mission, error) {
	iter := s.client.Collection("missions").Documents(ctx)
	defer iter.Stop()
	var list []*domain.Mission
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var m domain.Mission
		if err := doc.DataTo(&m); err == nil {
			list = append(list, &m)
		}
	}
	return list, nil
}

func (s *FirestoreStore) SaveOffer(ctx context.Context, offer *domain.Offer) error {
	docRef := s.client.Collection("missions").Doc(offer.MissionID).Collection("offers").Doc(offer.ID)
	_, err := docRef.Set(ctx, offer)
	return err
}

func (s *FirestoreStore) ListOffers(ctx context.Context, missionID string) ([]*domain.Offer, error) {
	iter := s.client.Collection("missions").Doc(missionID).Collection("offers").Documents(ctx)
	defer iter.Stop()
	var list []*domain.Offer
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var o domain.Offer
		if err := doc.DataTo(&o); err == nil {
			list = append(list, &o)
		}
	}
	return list, nil
}

func (s *FirestoreStore) RecordEvent(ctx context.Context, evt *domain.Event) error {
	docRef := s.client.Collection("missions").Doc(evt.MissionID).Collection("events").Doc(evt.ID)
	_, err := docRef.Set(ctx, evt)
	return err
}

func (s *FirestoreStore) ListEvents(ctx context.Context, missionID string) ([]*domain.Event, error) {
	iter := s.client.Collection("missions").Doc(missionID).Collection("events").OrderBy("createdAt", firestore.Asc).Documents(ctx)
	defer iter.Stop()
	var list []*domain.Event
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var e domain.Event
		if err := doc.DataTo(&e); err == nil {
			list = append(list, &e)
		}
	}
	return list, nil
}

func (s *FirestoreStore) SaveSupplier(ctx context.Context, sup *domain.Supplier) error {
	docRef := s.client.Collection("agents").Doc(sup.ID)
	_, err := docRef.Set(ctx, sup)
	return err
}

func (s *FirestoreStore) GetSupplier(ctx context.Context, id string) (*domain.Supplier, error) {
	doc, err := s.client.Collection("agents").Doc(id).Get(ctx)
	if err != nil {
		return nil, ErrNotFound
	}
	var sup domain.Supplier
	if err := doc.DataTo(&sup); err != nil {
		return nil, err
	}
	return &sup, nil
}

func (s *FirestoreStore) SearchSuppliers(ctx context.Context, category, postalDistrict string) ([]*domain.Supplier, error) {
	iter := s.client.Collection("agents").Documents(ctx)
	defer iter.Stop()
	var list []*domain.Supplier
	catLower := strings.ToLower(category)
	postLower := strings.ToLower(postalDistrict)

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var sup domain.Supplier
		if err := doc.DataTo(&sup); err == nil {
			matchCat := catLower == ""
			if !matchCat {
				for _, c := range sup.Capabilities {
					cL := strings.ToLower(c)
					if cL == catLower || strings.Contains(catLower, cL) || strings.Contains(cL, catLower) {
						matchCat = true
						break
					}
				}
			}
			matchPost := postLower == "" || strings.EqualFold(sup.ServiceArea.PostalDistrict, postLower)
			if matchCat && matchPost {
				list = append(list, &sup)
			}
		}
	}
	return list, nil
}

func (s *FirestoreStore) ListSuppliers(ctx context.Context) ([]*domain.Supplier, error) {
	iter := s.client.Collection("agents").Documents(ctx)
	defer iter.Stop()
	var list []*domain.Supplier
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var sup domain.Supplier
		if err := doc.DataTo(&sup); err == nil {
			list = append(list, &sup)
		}
	}
	return list, nil
}

func (s *FirestoreStore) SaveMilestone(ctx context.Context, ms *domain.Milestone) error {
	docRef := s.client.Collection("missions").Doc(ms.MissionID).Collection("milestones").Doc(ms.ID)
	_, err := docRef.Set(ctx, ms)
	return err
}

func (s *FirestoreStore) ListMilestones(ctx context.Context, missionID string) ([]*domain.Milestone, error) {
	iter := s.client.Collection("missions").Doc(missionID).Collection("milestones").Documents(ctx)
	defer iter.Stop()
	var list []*domain.Milestone
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var ms domain.Milestone
		if err := doc.DataTo(&ms); err == nil {
			list = append(list, &ms)
		}
	}
	return list, nil
}

func (s *FirestoreStore) UpdateMilestone(ctx context.Context, ms *domain.Milestone) error {
	return s.SaveMilestone(ctx, ms)
}

func (s *FirestoreStore) SaveCallout(ctx context.Context, c *domain.Callout) error {
	docRef := s.client.Collection("missions").Doc(c.MissionID).Collection("callouts").Doc(c.ID)
	_, err := docRef.Set(ctx, c)
	return err
}

func (s *FirestoreStore) GetCallout(ctx context.Context, id string) (*domain.Callout, error) {
	// Callouts live in per-mission subcollections and the interface only
	// takes the callout ID, so resolve it with a collection-group query on
	// the auto-indexed `id` field.
	iter := s.client.CollectionGroup("callouts").Where("id", "==", id).Limit(1).Documents(ctx)
	defer iter.Stop()
	doc, err := iter.Next()
	if err == iterator.Done {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	var c domain.Callout
	if err := doc.DataTo(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *FirestoreStore) ListCallouts(ctx context.Context, missionID string) ([]*domain.Callout, error) {
	iter := s.client.Collection("missions").Doc(missionID).Collection("callouts").Documents(ctx)
	defer iter.Stop()
	list := make([]*domain.Callout, 0)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var c domain.Callout
		if err := doc.DataTo(&c); err == nil {
			list = append(list, &c)
		}
	}
	return list, nil
}

func (s *FirestoreStore) SaveProofReceipt(ctx context.Context, receipt *domain.ProofReceipt) error {
	docRef := s.client.Collection("proofReceipts").Doc(receipt.ID)
	_, err := docRef.Set(ctx, receipt)
	return err
}

func (s *FirestoreStore) GetProofReceipt(ctx context.Context, id string) (*domain.ProofReceipt, error) {
	doc, err := s.client.Collection("proofReceipts").Doc(id).Get(ctx)
	if err != nil {
		return nil, ErrNotFound
	}
	var pr domain.ProofReceipt
	if err := doc.DataTo(&pr); err != nil {
		return nil, err
	}
	return &pr, nil
}

func (s *FirestoreStore) GetProofReceiptByToken(ctx context.Context, token string) (*domain.ProofReceipt, error) {
	iter := s.client.Collection("proofReceipts").Where("shareToken", "==", token).Limit(1).Documents(ctx)
	defer iter.Stop()
	doc, err := iter.Next()
	if err != nil {
		return nil, ErrNotFound
	}
	var pr domain.ProofReceipt
	if err := doc.DataTo(&pr); err != nil {
		return nil, err
	}
	return &pr, nil
}
