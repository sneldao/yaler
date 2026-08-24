package discovery

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/sneldao/yaler/internal/domain"
)

type exaCacheItem struct {
	suppliers []*domain.Supplier
	expiresAt time.Time
}

type DiscoveryService struct {
	exaKey   string
	apifyKey string
	client   *http.Client
	mu       sync.RWMutex
	cache    map[string]exaCacheItem
}

func NewDiscoveryService() *DiscoveryService {
	return &DiscoveryService{
		exaKey:   os.Getenv("EXA_API_KEY"),
		apifyKey: os.Getenv("APIFY_API_KEY"),
		client:   &http.Client{Timeout: 10 * time.Second},
		cache:    make(map[string]exaCacheItem),
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

// SearchExa queries Exa API for live London kitchen service providers with 10-minute in-memory caching.
func (d *DiscoveryService) SearchExa(ctx context.Context, category, district string) ([]*domain.Supplier, error) {
	if d.exaKey == "" {
		return nil, fmt.Errorf("EXA_API_KEY not configured")
	}

	cacheKey := strings.ToLower(category + ":" + district)

	// Check in-memory cache
	d.mu.RLock()
	item, found := d.cache[cacheKey]
	d.mu.RUnlock()

	if found && time.Now().Before(item.expiresAt) {
		return item.suppliers, nil
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
			PrincipalType: "FOUND",
			Capabilities:  []string{category, r.URL},
			ServiceArea: domain.ServiceArea{
				PostalDistrict: district,
				RadiusKM:       15,
			},
			Availability:     "UNVETTED",
			ReliabilityScore: 0,
			PriceTier:        "UNKNOWN",
			Evidence:         []string{"found_this_morning", r.URL},
			Status:           "FOUND",
		})
	}

	// Cache results for 10 minutes
	d.mu.Lock()
	d.cache[cacheKey] = exaCacheItem{
		suppliers: suppliers,
		expiresAt: time.Now().Add(10 * time.Minute),
	}
	d.mu.Unlock()

	return suppliers, nil
}

// Credential is a fail-closed public-register check.
type Credential struct {
	Name     string `json:"name"`
	Status   string `json:"status"` // listed | not_checked
	Register string `json:"register,omitempty"`
	AsOf     string `json:"asOf,omitempty"`
	Detail   string `json:"detail,omitempty"`
}

// CheckCredential looks up a name on Companies House via Apify.
// Any missing key, timeout, or unexpected page returns not_checked, but it
// records the reason in Detail so the concierge can tell "not on the register"
// apart from "the check itself broke" — fail-closed but observable.
func (d *DiscoveryService) CheckCredential(ctx context.Context, name string) Credential {
	out := Credential{Name: name, Status: "not_checked"}
	if d.apifyKey == "" || strings.TrimSpace(name) == "" {
		out.Detail = "apify key not configured"
		return out
	}

	q := strings.TrimSpace(name)
	q = strings.ReplaceAll(q, "(Synthetic)", "")
	q = strings.TrimSpace(q)
	startURL := "https://find-and-update.company-information.service.gov.uk/search/companies?q=" + url.QueryEscape(q)

	pageFn := "async function pageFunction(context) { const $ = context.$; return { text: $('body').text().replace(/\\s+/g, ' ').slice(0, 4000) }; }"
	body, _ := json.Marshal(map[string]any{
		"startUrls":    []map[string]string{{"url": startURL}},
		"pageFunction": pageFn,
	})

	req, err := http.NewRequestWithContext(ctx, "POST",
		"https://api.apify.com/v2/acts/apify~cheerio-scraper/run-sync-get-dataset-items?token="+d.apifyKey+"&timeout=90",
		bytes.NewBuffer(body),
	)
	if err != nil {
		out.Detail = "request build failed: " + err.Error()
		return out
	}
	req.Header.Set("Content-Type", "application/json")

	// A synchronous Cheerio scrape (start → fetch → render → return) routinely
	// takes 20-40s on Companies House and occasionally exceeds Apify's sync
	// window. The previous 12s timeout silently turned every check into
	// not_checked. timeout=90 gives the run the window inline; when it still
	// exceeds it Apify answers 201/202 with the run to poll, which we follow
	// to completion below.
	client := &http.Client{Timeout: 90 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		out.Detail = "apify request failed: " + err.Error()
		return out
	}
	defer func() { _ = resp.Body.Close() }()

	var rows []map[string]any

	switch {
	case resp.StatusCode == http.StatusOK:
		if derr := json.NewDecoder(resp.Body).Decode(&rows); derr != nil {
			out.Detail = "apify response decode failed: " + derr.Error()
			return out
		}

	case resp.StatusCode == http.StatusCreated, resp.StatusCode == http.StatusAccepted:
		// The run started but did not finish inside the sync window. Poll it
		// until SUCCEEDED, then read the dataset items.
		rows, out.Detail = d.apifyPollRun(ctx, resp.Body)
		if out.Detail != "" {
			return out
		}

	default:
		out.Detail = fmt.Sprintf("apify returned status %d", resp.StatusCode)

		// Multi-failover: try to extract the actor permission error from the
		// JSON body. Apify routinely refuses to run the cheerio-scraper actor
		// with "full-permission-actor-not-approved" until the account owner
		// approves its permissions once at the console URL. Surface that
		// specific message + the one-click approval link to the concierge
		// instead of a generic "apify 403".
		var apifyErr struct {
			Error struct {
				Type    string `json:"type"`
				Message string `json:"message"`
				Data    struct {
					ApprovalURL string `json:"approvalUrl"`
				} `json:"data"`
			} `json:"error"`
		}
		if derr := json.NewDecoder(resp.Body).Decode(&apifyErr); derr == nil && apifyErr.Error.Type == "full-permission-actor-not-approved" {
			out.Detail = "Apify: approve the cheerio-scraper actor once: " + apifyErr.Error.Data.ApprovalURL
		}
		return out
	}

	if len(rows) == 0 {
		out.Detail = "apify returned no rows"
		return out
	}

	raw, _ := rows[0]["text"].(string)
	hay := strings.ToLower(raw)
	needles := strings.Fields(strings.ToLower(q))
	if len(needles) == 0 {
		return out
	}
	hits := 0
	for _, n := range needles {
		if len(n) < 4 {
			continue
		}
		if strings.Contains(hay, n) {
			hits++
		}
	}
	if hits < 2 || !strings.Contains(hay, "companies house") {
		out.Detail = "name not confirmed on the public register"
		return out
	}

	out.Status = "listed"
	out.Register = "Companies House"
	out.AsOf = time.Now().UTC().Format("2 Jan 2006")
	out.Detail = "Name appears on the public company search"
	return out
}

// apifyPollRun handles the 201/202 case of run-sync-get-dataset-items: the
// run started but did not finish inside the sync window, so Apify returns the
// run object to poll. Waits for SUCCEEDED (up to ~75s), then reads the
// dataset items. Returns the rows and an empty detail on success.
func (d *DiscoveryService) apifyPollRun(ctx context.Context, body io.Reader) ([]map[string]any, string) {
	var runResp struct {
		Data struct {
			ID               string `json:"id"`
			DefaultDatasetID string `json:"defaultDatasetId"`
		} `json:"data"`
	}
	if err := json.NewDecoder(body).Decode(&runResp); err != nil {
		return nil, "apify run response decode failed: " + err.Error()
	}
	runID := runResp.Data.ID
	if runID == "" {
		return nil, "apify returned 201 without a run id"
	}
	datasetID := runResp.Data.DefaultDatasetID

	deadline := time.Now().Add(75 * time.Second)
	for time.Now().Before(deadline) {
		time.Sleep(3 * time.Second)
		status, dsID, err := d.apifyRunStatus(ctx, runID)
		if err != nil {
			return nil, err.Error()
		}
		if dsID != "" {
			datasetID = dsID
		}
		switch status {
		case "SUCCEEDED":
			items, ierr := d.apifyDatasetItems(ctx, datasetID)
			if ierr != nil {
				return nil, ierr.Error()
			}
			return items, ""
		case "FAILED", "TIMED-OUT", "ABORTED":
			return nil, "apify run " + status
		}
	}
	return nil, "apify run did not finish in time"
}

// apifyRunStatus fetches the run and returns (status, defaultDatasetId).
func (d *DiscoveryService) apifyRunStatus(ctx context.Context, runID string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET",
		"https://api.apify.com/v2/actor-runs/"+url.PathEscape(runID)+"?token="+d.apifyKey, nil)
	if err != nil {
		return "", "", err
	}
	resp, err := d.client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("apify run status returned %d", resp.StatusCode)
	}
	var out struct {
		Data struct {
			Status           string `json:"status"`
			DefaultDatasetID string `json:"defaultDatasetId"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", "", err
	}
	return out.Data.Status, out.Data.DefaultDatasetID, nil
}

// apifyDatasetItems reads the results of a finished run from its dataset.
func (d *DiscoveryService) apifyDatasetItems(ctx context.Context, datasetID string) ([]map[string]any, error) {
	req, err := http.NewRequestWithContext(ctx, "GET",
		"https://api.apify.com/v2/datasets/"+url.PathEscape(datasetID)+"/items?token="+d.apifyKey, nil)
	if err != nil {
		return nil, err
	}
	resp, err := d.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("apify dataset returned %d", resp.StatusCode)
	}
	var rows []map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&rows); err != nil {
		return nil, err
	}
	return rows, nil
}
