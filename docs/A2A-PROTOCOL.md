# Yaler Agent-to-Agent (A2A) Protocol Specification

This specification defines the JSON-RPC 2.0 Agent-to-Agent (A2A) interface enabling external supplier agents to register capabilities, receive mission callouts, and submit cryptographically verified quotes.

---

## Endpoint

```text
POST /api/a2a
Content-Type: application/json
```

---

## 1. Register Supplier Agent (`a2a.registerSupplier`)

Allows an external supplier agent to register or update its service profile and public key on the Yaler network.

### Request Payload

```json
{
  "jsonrpc": "2.0",
  "method": "a2a.registerSupplier",
  "params": {
    "id": "sup_london_commercial_cold_1",
    "displayName": "London Commercial Cold Care Ltd",
    "capabilities": ["commercial_refrigeration", "cold_room_maintenance"],
    "postalDistrict": "EC1",
    "radiusKm": 15,
    "priceTier": "STANDARD",
    "reliabilityScore": 0.96,
    "publicKey": "ed25519_pub_9a8f7e6d5c4b3a2"
  },
  "id": 1
}
```

### Response Payload

```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "registered",
    "supplierId": "sup_london_commercial_cold_1",
    "protocol": "a2a/v1"
  },
  "id": 1
}
```

---

## 2. Submit Signed Quote (`a2a.submitQuote`)

Allows a registered supplier agent to submit a cryptographically signed offer for an active mission.

### Request Payload

```json
{
  "jsonrpc": "2.0",
  "method": "a2a.submitQuote",
  "params": {
    "missionId": "m_1787018213167151000",
    "supplierAgentId": "sup_london_commercial_cold_1",
    "price": 380.00,
    "currency": "GBP",
    "availability": "SAME_DAY_2HR",
    "terms": "Includes callout fee, replacement relay part, and 90-day warranty.",
    "signature": "sig_a2a_ed25519_39f8d1c2b"
  },
  "id": 2
}
```

### Response Payload

```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "accepted",
    "offerId": "off_sup_london_commercial_cold_1_1787018213",
    "verifiedSignature": true
  },
  "id": 2
}
```

---

## Verification & Audit Logging

When `a2a.submitQuote` is invoked:
1. The quote is stored in Yaler's state store.
2. An audit event `A2A_QUOTE_RECEIVED` is appended to the mission event stream.
3. The Go Policy Engine evaluates the quote against the mission mandate ceiling and autonomy mode.
