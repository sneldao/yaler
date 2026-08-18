# Requirements: V1 Voice Loop

## Overview

Build a voice-first mission intake system for the Build Club hack night. A café owner calls a phone number, describes an urgent operational problem, and receives a spoken confirmation that a provider has been matched — all within a single phone call.

## Actors

- **Caller (Buyer):** An independent café/restaurant owner with an urgent operational problem.
- **Voice Agent:** The Vapi-powered conversational agent that extracts the mandate.
- **Backend:** The server that orchestrates Gemini ranking and returns results.
- **Gemini:** The LLM that ranks suppliers against the mandate.

## Functional Requirements

### FR-1: Voice intake and mandate extraction

- FR-1.1: The system SHALL accept inbound phone calls via a Vapi-configured phone number.
- FR-1.2: The voice agent SHALL greet the caller and ask what operational problem they need solved.
- FR-1.3: The voice agent SHALL extract through conversation: the problem description (goal), budget, deadline/urgency, and location.
- FR-1.4: The voice agent SHALL confirm the extracted mandate back to the caller before proceeding.
- FR-1.5: If the caller provides incomplete information, the agent SHALL ask targeted follow-up questions (not open-ended).
- FR-1.6: The agent SHALL use sensible defaults when the caller is vague (e.g., "as soon as possible" → urgency: immediate).

### FR-2: Supplier ranking

- FR-2.1: The backend SHALL receive the structured mandate from Vapi via function calling / webhook.
- FR-2.2: The backend SHALL call Gemini with the mandate and 3 supplier profiles.
- FR-2.3: Gemini SHALL return a ranked list of suppliers with reasoning for each.
- FR-2.4: The ranking SHALL consider: capability match, service area coverage, price fit within budget, availability match to deadline, and reliability score.
- FR-2.5: The backend SHALL select the top-ranked supplier (or return an escalation if none fit).

### FR-3: Booking confirmation

- FR-3.1: The voice agent SHALL speak the booking result naturally: provider name, expected arrival window, estimated cost.
- FR-3.2: The voice SHALL use ElevenLabs for high-quality speech synthesis.
- FR-3.3: The confirmation SHALL reference the caller's original problem to feel contextual.

### FR-4: Failure and escalation

- FR-4.1: If no supplier fits within the budget, the agent SHALL explain why and ask if the caller wants to increase the budget.
- FR-4.2: If no supplier is available within the deadline, the agent SHALL explain and offer the next available option.
- FR-4.3: If no supplier matches the service area, the agent SHALL explain the geographic limitation.
- FR-4.4: In any unrecoverable failure, the agent SHALL offer to "connect you to a human who can help" rather than ending abruptly.

### FR-5: Mandate enforcement

- FR-5.1: The system SHALL NOT select a supplier whose minimum price exceeds the stated budget.
- FR-5.2: The system SHALL NOT select a supplier who cannot attend within the stated deadline.
- FR-5.3: The system SHALL NOT select a supplier whose service area does not cover the caller's location.

## Non-Functional Requirements

### NFR-1: Response time

- NFR-1.1: Time from mandate extraction to spoken confirmation SHALL be under 8 seconds.
- NFR-1.2: The total call duration for a successful booking SHALL be under 90 seconds for a cooperative caller.

### NFR-2: Voice quality

- NFR-2.1: The agent voice SHALL sound natural and professional, not robotic.
- NFR-2.2: The agent SHALL handle interruptions gracefully (caller speaks over the agent).

### NFR-3: Reliability

- NFR-3.1: If Gemini is unavailable, the system SHALL return a graceful fallback message rather than silence or an error.
- NFR-3.2: If the backend is unreachable, Vapi SHALL deliver a fallback message to the caller.

### NFR-4: Demo-ability

- NFR-4.1: The system SHALL work with a live phone call for the 2-minute demo.
- NFR-4.2: The demo SHALL show both a successful booking and one failure/escalation scenario.

## Constraints

- 90 minutes total build time.
- No database or persistent storage.
- No web frontend.
- Supplier data is hardcoded (3 London providers).
- No real provider is contacted — the "booking" is simulated.
- Must use Vapi, Gemini, and ElevenLabs.

## Acceptance criteria

1. A phone call to the configured number starts a conversation.
2. The agent extracts goal, budget, deadline, and location from natural speech.
3. The agent confirms the mandate before proceeding.
4. A supplier is selected and the confirmation is spoken back.
5. Budget enforcement is demonstrated (caller says £200, cheapest option is £250 → escalation).
6. The entire flow completes in under 90 seconds.
