package store

import (
	"context"
	"errors"

	"github.com/sneldao/yaler/internal/domain"
)

var (
	ErrNotFound = errors.New("entity not found")
	ErrConflict = errors.New("version conflict")
)

// Store defines the persistence contract for Yaler entities.
type Store interface {
	// Mission operations
	CreateMission(ctx context.Context, m *domain.Mission) error
	GetMission(ctx context.Context, id string) (*domain.Mission, error)
	UpdateMission(ctx context.Context, m *domain.Mission) error
	ListMissions(ctx context.Context) ([]*domain.Mission, error)

	// Offers
	SaveOffer(ctx context.Context, offer *domain.Offer) error
	ListOffers(ctx context.Context, missionID string) ([]*domain.Offer, error)

	// Events
	RecordEvent(ctx context.Context, evt *domain.Event) error
	ListEvents(ctx context.Context, missionID string) ([]*domain.Event, error)

	// Suppliers
	SaveSupplier(ctx context.Context, sup *domain.Supplier) error
	GetSupplier(ctx context.Context, id string) (*domain.Supplier, error)
	SearchSuppliers(ctx context.Context, category, postalDistrict string) ([]*domain.Supplier, error)
	ListSuppliers(ctx context.Context) ([]*domain.Supplier, error)

	// Milestones
	SaveMilestone(ctx context.Context, ms *domain.Milestone) error
	ListMilestones(ctx context.Context, missionID string) ([]*domain.Milestone, error)
	UpdateMilestone(ctx context.Context, ms *domain.Milestone) error

	// Proof Receipts
	SaveProofReceipt(ctx context.Context, receipt *domain.ProofReceipt) error
	GetProofReceipt(ctx context.Context, id string) (*domain.ProofReceipt, error)
	GetProofReceiptByToken(ctx context.Context, token string) (*domain.ProofReceipt, error)
}
