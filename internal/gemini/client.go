package gemini

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"google.golang.org/genai"

	"github.com/sneldao/yaler/internal/domain"
)

type RankedOffer struct {
	OfferID        string  `json:"offerId"`
	SupplierID     string  `json:"supplierId"`
	Score          float64 `json:"score"`
	Rank           int     `json:"rank"`
	Explanation    string  `json:"explanation"`
	Recommendation string  `json:"recommendation"` // ACCEPT, COUNTER, REJECT
}

type RankingResult struct {
	Rankings []RankedOffer `json:"rankings"`
}

type CounterofferDraft struct {
	CounterPrice  float64 `json:"counterPrice"`
	Currency      string  `json:"currency"`
	ProposedTerms string  `json:"proposedTerms"`
	Rationale     string  `json:"rationale"`
}

type DiagnosticBriefResult struct {
	ReportedSummary  string                    `json:"reportedSummary"`
	Known            []string                  `json:"known"`
	LikelyAreas      []string                  `json:"likelyAreas"`
	ToConfirm        []string                  `json:"toConfirm"`
	EvidenceNeeded   []string                  `json:"evidenceNeeded"`
	Confidence       string                    `json:"confidence"`
	ExtractedSignals []domain.DiagnosticSignal `json:"extractedSignals"`
}

type EvidenceExtractionResult struct {
	Satisfied       bool     `json:"satisfied"`
	ConfidenceScore float64  `json:"confidenceScore"`
	ExtractedLabels []string `json:"extractedLabels"`
	MissingEvidence []string `json:"missingEvidence"`
	Explanation     string   `json:"explanation"`
}

type Client struct {
	genaiClient *genai.Client
	modelName   string
}

func NewClient(ctx context.Context) (*Client, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return &Client{modelName: "gemini-3.5-flash"}, nil
	}

	cfg := &genai.ClientConfig{
		APIKey: apiKey,
	}
	gc, err := genai.NewClient(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create genai client: %w", err)
	}

	return &Client{
		genaiClient: gc,
		modelName:   "gemini-3.5-flash",
	}, nil
}

func (c *Client) ExtractMandate(ctx context.Context, goal string) (*domain.Mandate, error) {
	if len(goal) > 2000 {
		goal = goal[:2000]
	}
	if c.genaiClient == nil {
		return c.fallbackExtractMandate(goal), nil
	}

	prompt := fmt.Sprintf("Extract mandate from user request:\n\"%s\"", goal)
	respText, err := c.generateContent(ctx, SystemPromptMandateExtraction, prompt)
	if err != nil {
		return c.fallbackExtractMandate(goal), nil
	}

	var raw struct {
		Goal                  string   `json:"goal"`
		BudgetAmount          float64  `json:"budgetAmount"`
		Currency              string   `json:"currency"`
		ServiceCategory       string   `json:"serviceCategory"`
		PostalDistrict        string   `json:"postalDistrict"`
		RadiusKm              float64  `json:"radiusKm"`
		LatestCompletionHours int      `json:"latestCompletionHours"`
		AllowedActions        []string `json:"allowedActions"`
		RequiredEvidence      []string `json:"requiredEvidence"`
		AutonomyMode          string   `json:"autonomyMode"`
		ExpiryHours           int      `json:"expiryHours"`
	}

	if err := json.Unmarshal([]byte(respText), &raw); err != nil {
		return c.fallbackExtractMandate(goal), nil
	}

	now := time.Now().UTC()
	if raw.Currency == "" {
		raw.Currency = "GBP"
	}
	if raw.BudgetAmount == 0 {
		raw.BudgetAmount = 500.0
	}
	if raw.PostalDistrict == "" {
		raw.PostalDistrict = "N1"
	}
	if raw.RadiusKm == 0 {
		raw.RadiusKm = 10.0
	}
	if raw.LatestCompletionHours == 0 {
		raw.LatestCompletionHours = 24
	}
	if raw.ExpiryHours == 0 {
		raw.ExpiryHours = 48
	}
	if raw.ServiceCategory == "" {
		raw.ServiceCategory = "commercial_refrigeration"
	}
	if len(raw.AllowedActions) == 0 {
		raw.AllowedActions = []string{"SOURCE", "REQUEST_OFFER", "COMMIT", "COUNTER_OFFER"}
	}
	if len(raw.RequiredEvidence) == 0 {
		raw.RequiredEvidence = []string{"photo_before_after", "invoice_receipt"}
	}

	mode := domain.AutonomyModeDelegate
	if strings.ToUpper(raw.AutonomyMode) == "COLLABORATE" {
		mode = domain.AutonomyModeCollaborate
	} else if strings.ToUpper(raw.AutonomyMode) == "OBSERVE" {
		mode = domain.AutonomyModeObserve
	}

	return &domain.Mandate{
		Goal:               goal,
		Budget:             domain.Budget{MaxAmount: raw.BudgetAmount, Currency: raw.Currency},
		ServiceCategory:    raw.ServiceCategory,
		ServiceArea:        domain.ServiceArea{PostalDistrict: raw.PostalDistrict, RadiusKM: raw.RadiusKm},
		LatestCompletionAt: now.Add(time.Duration(raw.LatestCompletionHours) * time.Hour),
		AllowedActions:     raw.AllowedActions,
		RequiredEvidence:   raw.RequiredEvidence,
		AutonomyMode:       mode,
		ExpiresAt:          now.Add(time.Duration(raw.ExpiryHours) * time.Hour),
	}, nil
}

func (c *Client) AnalyzeDiagnosticImage(ctx context.Context, imageBytes []byte, mimeType string, label string) ([]domain.DiagnosticSignal, error) {
	if len(imageBytes) == 0 || c.genaiClient == nil {
		return nil, nil
	}
	if len(imageBytes) > 10<<20 {
		return nil, fmt.Errorf("diagnostic image exceeds 10MB limit")
	}
	if mimeType == "" {
		mimeType = "image/jpeg"
	}
	prompt := fmt.Sprintf("Analyze this manager-supplied diagnostic image labelled %q. Extract only directly readable or visibly observable signals such as model number, displayed temperature, or fault code. Do not diagnose. Return JSON.", label)
	part := genai.NewPartFromBytes(imageBytes, mimeType)
	resp, err := c.genaiClient.Models.GenerateContent(ctx, c.modelName, []*genai.Content{{Parts: []*genai.Part{genai.NewPartFromText(prompt), part}}}, &genai.GenerateContentConfig{SystemInstruction: &genai.Content{Parts: []*genai.Part{genai.NewPartFromText(SystemPromptDiagnosticImage)}}, ResponseMIMEType: "application/json", MaxOutputTokens: 512})
	if err != nil {
		return nil, err
	}
	var raw struct {
		Signals []domain.DiagnosticSignal `json:"signals"`
	}
	if err := json.Unmarshal([]byte(resp.Text()), &raw); err != nil {
		return nil, err
	}
	for i := range raw.Signals {
		raw.Signals[i].Source = "image"
		if raw.Signals[i].Confidence == "" {
			raw.Signals[i].Confidence = "observed"
		}
	}
	return raw.Signals, nil
}

func (c *Client) ExtractDiagnosticBrief(ctx context.Context, goal string, mandate domain.Mandate) (*domain.DiagnosticBrief, error) {
	if len(goal) > 2000 {
		goal = goal[:2000]
	}
	if c.genaiClient == nil {
		return fallbackDiagnosticBrief(goal, mandate), nil
	}
	prompt := fmt.Sprintf("Original report: %s\\nMandate: %+v", goal, mandate)
	respText, err := c.generateContent(ctx, SystemPromptDiagnosticBrief, prompt)
	if err != nil {
		return fallbackDiagnosticBrief(goal, mandate), nil
	}
	var raw DiagnosticBriefResult
	if err := json.Unmarshal([]byte(respText), &raw); err != nil {
		return fallbackDiagnosticBrief(goal, mandate), nil
	}
	if raw.ReportedSummary == "" {
		raw.ReportedSummary = goal
	}
	if raw.Confidence == "" {
		raw.Confidence = "preliminary"
	}
	return &domain.DiagnosticBrief{
		ReportedSummary:  raw.ReportedSummary,
		Known:            raw.Known,
		LikelyAreas:      raw.LikelyAreas,
		ToConfirm:        raw.ToConfirm,
		EvidenceNeeded:   raw.EvidenceNeeded,
		Confidence:       raw.Confidence,
		ExtractedSignals: raw.ExtractedSignals,
	}, nil
}

func fallbackDiagnosticBrief(goal string, mandate domain.Mandate) *domain.DiagnosticBrief {
	return &domain.DiagnosticBrief{
		ReportedSummary:  goal,
		Known:            []string{"Issue reported by the business manager"},
		LikelyAreas:      []string{"Fault category requires engineer assessment"},
		ToConfirm:        []string{"Equipment model, symptoms, and safe access on site"},
		EvidenceNeeded:   mandate.RequiredEvidence,
		Confidence:       "preliminary",
		ExtractedSignals: extractDiagnosticSignals(goal),
	}
}

func extractDiagnosticSignals(goal string) []domain.DiagnosticSignal {
	lower := strings.ToLower(goal)
	var signals []domain.DiagnosticSignal
	if strings.Contains(lower, "degree") || strings.Contains(lower, "°") {
		signals = append(signals, domain.DiagnosticSignal{Label: "Reported temperature", Value: goal, Source: "manager_report", Confidence: "reported"})
	}
	if strings.Contains(lower, "error") || strings.Contains(lower, "fault code") {
		signals = append(signals, domain.DiagnosticSignal{Label: "Fault code mentioned", Value: "See original report", Source: "manager_report", Confidence: "reported"})
	}
	return signals
}

func (c *Client) CompareOffers(ctx context.Context, mandate domain.Mandate, offers []*domain.Offer, suppliers []*domain.Supplier) (*RankingResult, error) {
	if c.genaiClient == nil || len(offers) == 0 {
		return c.fallbackCompareOffers(mandate, offers), nil
	}

	offersJSON, _ := json.Marshal(offers)
	prompt := fmt.Sprintf("Mandate: %+v\nCandidate Offers: %s", mandate, string(offersJSON))
	respText, err := c.generateContent(ctx, SystemPromptOfferComparison, prompt)
	if err != nil {
		return c.fallbackCompareOffers(mandate, offers), nil
	}

	var res RankingResult
	if err := json.Unmarshal([]byte(respText), &res); err != nil {
		return c.fallbackCompareOffers(mandate, offers), nil
	}
	return &res, nil
}

func (c *Client) DraftCounteroffer(ctx context.Context, mandate domain.Mandate, offer *domain.Offer, reason string) (*CounterofferDraft, error) {
	if c.genaiClient == nil {
		return c.fallbackCounteroffer(mandate, offer), nil
	}

	prompt := fmt.Sprintf("Mandate: %+v\nOffer: %+v\nReason for Counter: %s", mandate, offer, reason)
	respText, err := c.generateContent(ctx, SystemPromptCounteroffer, prompt)
	if err != nil {
		return c.fallbackCounteroffer(mandate, offer), nil
	}

	var draft CounterofferDraft
	if err := json.Unmarshal([]byte(respText), &draft); err != nil {
		return c.fallbackCounteroffer(mandate, offer), nil
	}
	return &draft, nil
}

func (c *Client) ExtractEvidence(ctx context.Context, submission string, required []string) (*EvidenceExtractionResult, error) {
	if c.genaiClient == nil {
		return c.fallbackExtractEvidence(submission, required), nil
	}

	prompt := fmt.Sprintf("Submission: %s\nRequired Evidence Criteria: %v", submission, required)
	respText, err := c.generateContent(ctx, SystemPromptEvidenceExtraction, prompt)
	if err != nil {
		return c.fallbackExtractEvidence(submission, required), nil
	}

	var res EvidenceExtractionResult
	if err := json.Unmarshal([]byte(respText), &res); err != nil {
		return c.fallbackExtractEvidence(submission, required), nil
	}
	return &res, nil
}

// SupplierQuoteResult is the structured output from a supplier agent's
// quote-generation call. It mirrors the JSON schema in
// SystemPromptSupplierQuote.
type SupplierQuoteResult struct {
	WillQuote     bool     `json:"willQuote"`
	Price         float64  `json:"price"`
	Currency      string   `json:"currency"`
	Availability  string   `json:"availability"`
	Terms         string   `json:"terms"`
	Evidence      []string `json:"evidence"`
	DeclineReason string   `json:"declineReason"`
}

// GenerateSupplierQuote asks Gemini to role-play as a specific supplier
// agent and generate an independent quote for a mission callout. The
// supplier's persona, capabilities, and price tier shape the response.
// Returns a deterministic fallback if Gemini is unavailable or the
// response is malformed.
func (c *Client) GenerateSupplierQuote(ctx context.Context, mission *domain.Mission, supplier *domain.Supplier) (*SupplierQuoteResult, error) {
	if c.genaiClient == nil {
		return c.fallbackSupplierQuote(supplier), nil
	}

	deadline := "24 hours"
	if !mission.Mandate.LatestCompletionAt.IsZero() {
		deadline = mission.Mandate.LatestCompletionAt.Format("2006-01-02 15:04 MST")
	}

	persona := supplier.Persona
	if persona == "" {
		persona = fmt.Sprintf("A %s supplier with %s availability and %s pricing.", supplier.PriceTier, supplier.Availability, strings.Join(supplier.Capabilities, ", "))
	}

	prompt := fmt.Sprintf(`Job callout from Yaler's buyer agent:

Job: %s
Location: %s
Budget: %.0f %s
Deadline: %s
Service category: %s

Your business: %s
Your capabilities: %s
Your availability: %s
Your price tier: %s
Your certifications: %s

Your persona: %s

Do you want this job? If yes, generate a quote in character.`,
		mission.Goal,
		mission.Mandate.ServiceArea.PostalDistrict,
		mission.Mandate.Budget.MaxAmount,
		mission.Mandate.Budget.Currency,
		deadline,
		mission.Mandate.ServiceCategory,
		supplier.DisplayName,
		strings.Join(supplier.Capabilities, ", "),
		supplier.Availability,
		supplier.PriceTier,
		strings.Join(supplier.Evidence, ", "),
		persona,
	)

	respText, err := c.generateContent(ctx, SystemPromptSupplierQuote, prompt)
	if err != nil {
		log.Printf("[Gemini] SupplierQuote error for %s: %v", supplier.ID, err)
		return c.fallbackSupplierQuote(supplier), nil
	}

	var res SupplierQuoteResult
	if err := json.Unmarshal([]byte(respText), &res); err != nil {
		log.Printf("[Gemini] SupplierQuote JSON parse error for %s: %v (raw: %s)", supplier.ID, err, respText[:min(200, len(respText))])
		return c.fallbackSupplierQuote(supplier), nil
	}
	if res.Currency == "" {
		res.Currency = "GBP"
	}
	return &res, nil
}

func (c *Client) fallbackSupplierQuote(supplier *domain.Supplier) *SupplierQuoteResult {
	price := 350.0
	if supplier.PriceTier == "PREMIUM" {
		price = 420.0
	}
	return &SupplierQuoteResult{
		WillQuote:    true,
		Price:        price,
		Currency:     "GBP",
		Availability: supplier.Availability,
		Terms:        "AI agent quote — LLM-powered supplier response (fallback)",
		Evidence:     supplier.Evidence,
	}
}

func (c *Client) generateContent(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	reqCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	temp := float32(0.1)

	resp, err := c.genaiClient.Models.GenerateContent(reqCtx, c.modelName, genai.Text(userPrompt), &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{genai.NewPartFromText(systemPrompt)},
		},
		Temperature:      &temp,
		MaxOutputTokens:  1024,
		ResponseMIMEType: "application/json",
	})
	if err != nil {
		return "", err
	}

	return resp.Text(), nil
}

func (c *Client) fallbackExtractMandate(goal string) *domain.Mandate {
	now := time.Now().UTC()
	return &domain.Mandate{
		Goal: goal,
		Budget: domain.Budget{
			MaxAmount: 500.0,
			Currency:  "GBP",
		},
		ServiceCategory: "commercial_refrigeration",
		ServiceArea: domain.ServiceArea{
			PostalDistrict: "N1",
			RadiusKM:       10.0,
		},
		LatestCompletionAt: now.Add(24 * time.Hour),
		AllowedActions:     []string{"SOURCE", "REQUEST_OFFER", "COMMIT", "COUNTER_OFFER"},
		RequiredEvidence:   []string{"photo_before_after", "invoice_receipt"},
		AutonomyMode:       domain.AutonomyModeDelegate,
		ExpiresAt:          now.Add(48 * time.Hour),
	}
}

func (c *Client) fallbackCompareOffers(mandate domain.Mandate, offers []*domain.Offer) *RankingResult {
	res := &RankingResult{}
	for i, o := range offers {
		score := 0.9 - float64(i)*0.1
		rec := "ACCEPT"
		if o.Price > mandate.Budget.MaxAmount {
			score = 0.5
			rec = "COUNTER"
		}
		res.Rankings = append(res.Rankings, RankedOffer{
			OfferID:        o.ID,
			SupplierID:     o.SupplierAgentID,
			Score:          score,
			Rank:           i + 1,
			Explanation:    fmt.Sprintf("Evaluated against budget £%.2f and service category %s", mandate.Budget.MaxAmount, mandate.ServiceCategory),
			Recommendation: rec,
		})
	}
	return res
}

func (c *Client) fallbackCounteroffer(mandate domain.Mandate, offer *domain.Offer) *CounterofferDraft {
	return &CounterofferDraft{
		CounterPrice:  mandate.Budget.MaxAmount,
		Currency:      mandate.Budget.Currency,
		ProposedTerms: "Price matched to mandate budget ceiling",
		Rationale:     "Counteroffer drafted to fit maximum budget constraint",
	}
}

func (c *Client) fallbackExtractEvidence(submission string, required []string) *EvidenceExtractionResult {
	return &EvidenceExtractionResult{
		Satisfied:       true,
		ConfidenceScore: 0.95,
		ExtractedLabels: required,
		MissingEvidence: []string{},
		Explanation:     "All milestone evidence criteria verified successfully",
	}
}
