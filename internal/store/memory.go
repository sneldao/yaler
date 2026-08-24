package store

import (
	"context"
	"strings"
	"sync"

	"github.com/sneldao/yaler/internal/domain"
)

// MemoryStore is a thread-safe in-memory store implementation for testing and development.
type MemoryStore struct {
	mu            sync.RWMutex
	missions      map[string]*domain.Mission
	offers        map[string][]*domain.Offer
	events        map[string][]*domain.Event
	suppliers     map[string]*domain.Supplier
	milestones    map[string][]*domain.Milestone
	callouts      map[string]*domain.Callout
	feedback      map[string]*domain.MissionFeedback
	proofReceipts map[string]*domain.ProofReceipt
}

// NewMemoryStore constructs a MemoryStore.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		missions:      make(map[string]*domain.Mission),
		offers:        make(map[string][]*domain.Offer),
		events:        make(map[string][]*domain.Event),
		suppliers:     make(map[string]*domain.Supplier),
		milestones:    make(map[string][]*domain.Milestone),
		callouts:      make(map[string]*domain.Callout),
		feedback:      make(map[string]*domain.MissionFeedback),
		proofReceipts: make(map[string]*domain.ProofReceipt),
	}
}

func (s *MemoryStore) CreateMission(ctx context.Context, m *domain.Mission) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.missions[m.ID]; exists {
		return ErrConflict
	}
	cp := *m
	s.missions[m.ID] = &cp
	return nil
}

func (s *MemoryStore) GetMission(ctx context.Context, id string) (*domain.Mission, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	m, exists := s.missions[id]
	if !exists {
		return nil, ErrNotFound
	}
	cp := *m
	return &cp, nil
}

func (s *MemoryStore) UpdateMission(ctx context.Context, m *domain.Mission) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	existing, exists := s.missions[m.ID]
	if !exists {
		return ErrNotFound
	}
	if existing.Version >= m.Version {
		return ErrConflict
	}
	cp := *m
	s.missions[m.ID] = &cp
	return nil
}

func (s *MemoryStore) ListMissions(ctx context.Context) ([]*domain.Mission, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []*domain.Mission
	for _, m := range s.missions {
		cp := *m
		res = append(res, &cp)
	}
	return res, nil
}

func (s *MemoryStore) SaveOffer(ctx context.Context, offer *domain.Offer) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *offer
	s.offers[offer.MissionID] = append(s.offers[offer.MissionID], &cp)
	return nil
}

func (s *MemoryStore) ListOffers(ctx context.Context, missionID string) ([]*domain.Offer, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []*domain.Offer
	for _, o := range s.offers[missionID] {
		cp := *o
		res = append(res, &cp)
	}
	return res, nil
}

func (s *MemoryStore) RecordEvent(ctx context.Context, evt *domain.Event) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *evt
	s.events[evt.MissionID] = append(s.events[evt.MissionID], &cp)
	return nil
}

func (s *MemoryStore) ListEvents(ctx context.Context, missionID string) ([]*domain.Event, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []*domain.Event
	for _, e := range s.events[missionID] {
		cp := *e
		res = append(res, &cp)
	}
	return res, nil
}

func (s *MemoryStore) SaveSupplier(ctx context.Context, sup *domain.Supplier) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *sup
	s.suppliers[sup.ID] = &cp
	return nil
}

func (s *MemoryStore) GetSupplier(ctx context.Context, id string) (*domain.Supplier, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sup, exists := s.suppliers[id]
	if !exists {
		return nil, ErrNotFound
	}
	cp := *sup
	return &cp, nil
}

func (s *MemoryStore) SearchSuppliers(ctx context.Context, category, postalDistrict string) ([]*domain.Supplier, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []*domain.Supplier
	catLower := strings.ToLower(category)
	postLower := strings.ToLower(postalDistrict)

	for _, sup := range s.suppliers {
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
			cp := *sup
			res = append(res, &cp)
		}
	}
	return res, nil
}

func (s *MemoryStore) ListSuppliers(ctx context.Context) ([]*domain.Supplier, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []*domain.Supplier
	for _, sup := range s.suppliers {
		cp := *sup
		res = append(res, &cp)
	}
	return res, nil
}

func (s *MemoryStore) SaveMilestone(ctx context.Context, ms *domain.Milestone) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *ms
	// Check if updating existing
	list := s.milestones[ms.MissionID]
	updated := false
	for i, existing := range list {
		if existing.ID == ms.ID {
			list[i] = &cp
			updated = true
			break
		}
	}
	if !updated {
		s.milestones[ms.MissionID] = append(s.milestones[ms.MissionID], &cp)
	}
	return nil
}

func (s *MemoryStore) ListMilestones(ctx context.Context, missionID string) ([]*domain.Milestone, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var res []*domain.Milestone
	for _, ms := range s.milestones[missionID] {
		cp := *ms
		res = append(res, &cp)
	}
	return res, nil
}

func (s *MemoryStore) UpdateMilestone(ctx context.Context, ms *domain.Milestone) error {
	return s.SaveMilestone(ctx, ms)
}

func (s *MemoryStore) SaveCallout(ctx context.Context, c *domain.Callout) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *c
	s.callouts[c.ID] = &cp
	return nil
}

func (s *MemoryStore) GetCallout(ctx context.Context, id string) (*domain.Callout, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c, exists := s.callouts[id]
	if !exists {
		return nil, ErrNotFound
	}
	cp := *c
	return &cp, nil
}

func (s *MemoryStore) ListCallouts(ctx context.Context, missionID string) ([]*domain.Callout, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]*domain.Callout, 0)
	for _, c := range s.callouts {
		if c.MissionID == missionID {
			cp := *c
			res = append(res, &cp)
		}
	}
	return res, nil
}

func (s *MemoryStore) SaveMissionFeedback(ctx context.Context, f *domain.MissionFeedback) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *f
	s.feedback[f.MissionID] = &cp
	return nil
}

func (s *MemoryStore) GetMissionFeedback(ctx context.Context, missionID string) (*domain.MissionFeedback, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	f, exists := s.feedback[missionID]
	if !exists {
		return nil, ErrNotFound
	}
	cp := *f
	return &cp, nil
}

func (s *MemoryStore) ListMissionFeedbackBySupplier(ctx context.Context, supplierID string) ([]*domain.MissionFeedback, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make([]*domain.MissionFeedback, 0)
	for _, f := range s.feedback {
		if f.SupplierID == supplierID {
			cp := *f
			res = append(res, &cp)
		}
	}
	return res, nil
}

func (s *MemoryStore) SaveProofReceipt(ctx context.Context, receipt *domain.ProofReceipt) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *receipt
	s.proofReceipts[receipt.ID] = &cp
	return nil
}

func (s *MemoryStore) GetProofReceipt(ctx context.Context, id string) (*domain.ProofReceipt, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rc, exists := s.proofReceipts[id]
	if !exists {
		return nil, ErrNotFound
	}
	cp := *rc
	return &cp, nil
}

func (s *MemoryStore) GetProofReceiptByToken(ctx context.Context, token string) (*domain.ProofReceipt, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, rc := range s.proofReceipts {
		if rc.ShareToken == token {
			cp := *rc
			return &cp, nil
		}
	}
	return nil, ErrNotFound
}
