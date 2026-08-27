# Incentive Design — Why Yaler Doesn't String People Along

## The problem

In the status quo of local-services matching, an engineer who declines or is
slow faces an asymmetric cost: saying no risks losing a relationship, while
holding multiple leads open costs nothing in the moment. Under uncertainty
with no enforced deadline, holding optionality is the dominant strategy —
which is why open-ended "let me check and get back to you" negotiations always
drift long. Whoever holds optionality longest wins, and there's no mechanism
forcing a decision.

## The structural fix (the base mechanic)

**Stop running sequential negotiation; run parallel, time-boxed offers.**

Yaler broadcasts to several qualified engineers at once with a short accept
window (10 minutes, not the previous 4 hours). First genuine accept wins;
everyone else's callout is cancelled and disappears from their screen. An
engineer can't string along a lead they don't know they have.

This is the same trick that made Uber's matching work: instead of "ask
driver A, wait, then ask driver B," broadcast to several at once, first
accept wins. Once the market clears in parallel, the behavioural/incentive
layer sits on top, not trying to overcome sequential bargaining.

## The incentive layer (on top of the base mechanic)

1. **Active, binary choice, not passive.** A visible countdown timer with
   "Accept / Decline" — not "respond when ready." Thaler's active-choice
   research shows this alone raises resolution rates.

2. **Penalize latency, not declining.** A fast honest decline is neutral —
   good engineers are allowed to be busy. Silence and non-response are the
   penalty — that's what creates the stringing-along cost. The reputation
   score (`ReliabilityFromLatency`) decays on expiry/silence and rewards
   fast honest accept/decline.

3. **Make the cost of holding visible to the engineer.** The callout message
   says "this closes in 10 minutes" and "N other engineers can see this" —
   converting the invisible externality (vendor's wasted time) into a felt
   constraint on the engineer's own screen. Loss aversion pointed at the
   right party.

4. **Derive reputation from the audit trail.** Response latency, completion
   rate, price-adherence-to-quote, and specialty hit-rate are all derived
   from the append-only event log — not self-reported. Self-report on "I've
   fixed loads of these fridges" is cheap talk; a derived track record isn't.

5. **Explainable selection.** The receipt shows why an engineer was picked
   ("20% under budget · 3 prior N1 jobs · 12-min accept time · 96%
   reliability"). That explainability is a trust mechanism, not just UX.

6. **Vendor-set trade-off policy.** The Mandate object converts an implicit
   weighting the manager could never articulate on the phone into something
   they set once, consciously, and the agent optimises against transparently.

## The field experiment

The infrastructure (Firestore events, deterministic policy engine) makes
this a genuine A/B, not a guess. Each mission is assigned to a `parallel` or
`sequential` cohort at creation (`ExperimentCohort` on the Mission). The
metrics that matter: time-to-confirmed-booking, price variance, and
repeat-vendor rate. Most local-services marketplaces never measure whether
their matching mechanism actually beats word-of-mouth.

## The 10x claim

If it holds, it's less "we have an AI agent" and more "we removed the
structural reason hostage-holding was ever rational." That's a more
defensible moat than model quality — a competitor can copy prompts but not
market microstructure without redesigning the whole flow.
