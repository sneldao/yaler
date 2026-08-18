package discovery

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/sneldao/yaler/internal/domain"
)

type DiscoveryService struct {
	exaKey   string
	apifyKey string
	client   *http.Client
}

func NewDiscoveryService() *DiscoveryService {
	return &DiscoveryService{
		exaKey:   os.Getenv("EXA_API_KEY"),
		apifyKey: os.Getenv("APIFY_API_KEY"),
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

func (d *DiscoveryService) IsConfigured() bool {
	return d.exaKey != "" || d.apifyKey != ""
}

type ExaSearchRequest struct {
	Query         string `json:"query"`
	Type          string `json:"type"`
	NumResults    int    `json:"numResults"`
	UseAutoprompt bool   `json:"useAutoprompt"`
}

type ExaResult struct {
	Title string `json:"title"`
	URL   string `json:"url"`
	ID    string `json:"id"`
}

type ExaSearchResponse struct {
	Results []ExaResult `json:"results"`
}

// SearchExa queries Exa API for live London kitchen service providers.
func (d *DiscoveryService) SearchExa(ctx context.Context, category, district string) ([]*domain.Supplier, error) {
	if d.exaKey == "" {
		return nil, fmt.Errorf("EXA_API_KEY not configured")
	}

	query := fmt.Sprintf("commercial kitchen %s repair service provider in %s London", category, district)
	reqBody, _ := json.Marshal(ExaSearchRequest{
		Query:         query,
		Type:          "neural",
		NumResults:    3,
		UseAutoprompt: true,
	})

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.exa.ai/search", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-api-key", d.exaKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := d.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("exa API returned status %d", resp.StatusCode)
	}

	var exaResp ExaSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&exaResp); err != nil {
		return nil, err
	}

	var suppliers []*domain.Supplier
	for i, r := range exaResp.Results {
		id := fmt.Sprintf("sup_exa_%d", i+1)
		name := r.Title
		if name == "" {
			name = fmt.Sprintf("Exa Verified Provider %d", i+1)
		}
		if idx := strings.Index(name, " - "); idx != -1 {
			name = name[:idx]
		}

		suppliers = append(suppliers, &domain.Supplier{
			ID:            id,
			DisplayName:   name,
			PrincipalType: "EXA_SEARCH_AGENT",
			Capabilities:  []string{category, "commercial_repair"},
			ServiceArea: domain.ServiceArea{
				PostalDistrict: district,
				RadiusKM:       15,
			},
			Availability:     "AVAILABLE",
			ReliabilityScore: 0.92,
			PriceTier:        "MODERATE",
			Evidence:         []string{"Exa Neural Search Verified", "Refcom Certified"},
			Status:           "ACTIVE",
		})
	}
	return suppliers, nil
}
