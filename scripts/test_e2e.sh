#!/usr/bin/env bash
set -e

BASE_URL="http://localhost:8081"

echo "=== 1. Creating Mission with Gemini Mandate Extraction ==="
CREATE_RESP=$(curl -s -X POST "$BASE_URL/api/missions" \
  -H "Content-Type: application/json" \
  -d '{"goal": "Commercial fridge temperature rising, need repair before lunch, budget £500, we are in N1"}')

echo "$CREATE_RESP"
MISSION_ID=$(echo "$CREATE_RESP" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

if [ -z "$MISSION_ID" ]; then
  echo "Failed to extract MISSION_ID!"
  exit 1
fi

echo "Created Mission ID: $MISSION_ID"

echo -e "\n=== 2. Starting Mission Loop ==="
START_RESP=$(curl -s -X POST "$BASE_URL/api/missions/$MISSION_ID/start")
echo "$START_RESP"

sleep 1

echo -e "\n=== 3. Listing Received Offers ==="
OFFERS_RESP=$(curl -s "$BASE_URL/api/missions/$MISSION_ID/offers")
echo "$OFFERS_RESP"

echo -e "\n=== 4. Fetching Mission Audit Events ==="
EVENTS_RESP=$(curl -s "$BASE_URL/api/missions/$MISSION_ID/events")
echo "$EVENTS_RESP"

echo -e "\n=== 5. Submitting Supplier Completion Evidence ==="
EVIDENCE_RESP=$(curl -s -X POST "$BASE_URL/api/missions/$MISSION_ID/evidence" \
  -H "Content-Type: application/json" \
  -d '{
    "milestoneId": "ms_'$MISSION_ID'",
    "textReport": "Technician replaced faulty compressor relay, verified temperature dropping to 3°C.",
    "photoUrl": "https://storage.googleapis.com/yaler-evidence/proof_temp_check.jpg"
  }')
echo "$EVIDENCE_RESP"

echo -e "\n=== 6. Fetching Redacted Proof Receipt ==="
RECEIPT_RESP=$(curl -s "$BASE_URL/api/missions/$MISSION_ID/receipt")
echo "$RECEIPT_RESP"

echo -e "\n=== E2E Test Completed Successfully! ==="
