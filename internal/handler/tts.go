package handler

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"sync"
)

var (
	ttsCache   = make(map[string][]byte)
	ttsCacheMu sync.RWMutex
)

type ElevenLabsTTSRequest struct {
	Text          string                   `json:"text"`
	ModelID       string                   `json:"model_id"`
	VoiceSettings *ElevenLabsVoiceSettings `json:"voice_settings,omitempty"`
}

type ElevenLabsVoiceSettings struct {
	Stability       float64 `json:"stability"`
	SimilarityBoost float64 `json:"similarity_boost"`
}

func (h *Handler) HandleTTS(w http.ResponseWriter, r *http.Request) {
	apiKey := os.Getenv("ELEVENLABS_API_KEY")
	if apiKey == "" {
		writeError(w, http.StatusServiceUnavailable, "ELEVENLABS_API_KEY not configured")
		return
	}

	var req struct {
		Text    string `json:"text"`
		VoiceID string `json:"voiceId,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Text == "" {
		writeError(w, http.StatusBadRequest, "Text parameter is required")
		return
	}

	if len(req.Text) > 1000 {
		req.Text = req.Text[:1000]
	}

	voiceID := req.VoiceID
	if voiceID == "" {
		voiceID = "21m00Tcm4TlvDq8ikWAM" // Default Rachel voice
	}

	hashKey := sha256.Sum256([]byte(voiceID + ":" + req.Text))
	cacheKey := hex.EncodeToString(hashKey[:])

	// Check audio cache
	ttsCacheMu.RLock()
	cachedAudio, found := ttsCache[cacheKey]
	ttsCacheMu.RUnlock()

	if found {
		w.Header().Set("Content-Type", "audio/mpeg")
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Header().Set("X-Cache-Status", "HIT")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(cachedAudio)
		return
	}

	ttsReq := ElevenLabsTTSRequest{
		Text:    req.Text,
		ModelID: "eleven_monolingual_v1",
		VoiceSettings: &ElevenLabsVoiceSettings{
			Stability:       0.5,
			SimilarityBoost: 0.75,
		},
	}

	reqBytes, err := json.Marshal(ttsReq)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to encode TTS request")
		return
	}

	url := "https://api.elevenlabs.io/v1/text-to-speech/" + voiceID
	outReq, err := http.NewRequestWithContext(r.Context(), "POST", url, bytes.NewBuffer(reqBytes))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create TTS request")
		return
	}

	outReq.Header.Set("xi-api-key", apiKey)
	outReq.Header.Set("Content-Type", "application/json")
	outReq.Header.Set("Accept", "audio/mpeg")

	resp, err := http.DefaultClient.Do(outReq)
	if err != nil {
		writeError(w, http.StatusBadGateway, "ElevenLabs API call failed")
		return
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		writeError(w, resp.StatusCode, "ElevenLabs TTS request failed")
		return
	}

	audioBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to read audio stream")
		return
	}

	// Cache synthesized MP3 bytes
	ttsCacheMu.Lock()
	ttsCache[cacheKey] = audioBytes
	ttsCacheMu.Unlock()

	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Header().Set("X-Cache-Status", "MISS")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(audioBytes)
}
