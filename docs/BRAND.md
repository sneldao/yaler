# Brand

Yaler should look like a receipt, not a chatbot. Dark ink, warm paper, one policy node.

## Design language

Yaler's look and feel is **Nordic functionalism with progressive disclosure** — Scandinavian-style warm minimalism where depth unfolds on demand rather than being shown all at once.

- **Visual lineage.** Warm muted palette, a serif display face over system sans, functional restraint with a hint of warmth. The spiritual roots are Swedish *funktionalism* and *Vackrare vardagsvara* ("more beautiful everyday goods"): well-designed objects should be everyday, not luxury. Closer to Dieter Rams' "less, but better" than to flat SaaS dashboards.
- **Progressive disclosure.** The surface stays quiet; the user asks for more. The real job form folds behind "This is a real job." The mandate editor tucks autonomy modes and evidence checklists behind text links. The receipt defaults to redacted names. Depth is always one opt-in away, never on by default.
- **Restraint as a product principle.** The thread connecting the palette, the disclosures, the autonomy modes, and the over-budget stop is that the app consistently chooses to show less and let the user ask for more. Minimalism alone is quiet; disclosure makes the quietness feel decided.
- **What this is not.** Not a chatbot, not an agent dashboard, not a glassmorphism gradient. Do not add aurora backdrops, pointer-tracking spotlights, decorative "AI network" orbs, or layers of nesting that shadow-stack on top of each other.

## Voice

- Outcome over conversation.
- Mandate before action.
- Proof over assertion.

Do not use playful mascots, neon agent-marketplace gradients, or stock "AI network" orbs.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#12212B` | Mark field, headings, primary UI |
| Paper | `#F4EFE6` | Page, OG background, receipt |
| Mandate | `#2A6F6A` | Policy node, success, links |
| Escalation | `#C45C26` | Exceptions, the supply stroke |
| Quiet | `#5C5348` | Secondary copy |

## Type

- Display: Georgia / Source Serif (wordmark, titles)
- UI: system-ui / sans (forms, timeline, captions)

## Mark

`assets/brand/yaler-mark.svg` is two strokes meeting at a teal node: demand (paper) and supply (escalation) join under policy. The cut circle on the right is the proof-receipt punch.

- Wordmark: `assets/brand/yaler-wordmark.svg`
- Open Graph source: `assets/brand/og.svg`
- Safari pinned tab: `assets/brand/safari-pinned-tab.svg` (monochrome)

## Site files

Canonical copies live in `assets/site/`. Copy them into `web/public/` when the Astro app is scaffolded.

| File | Role |
| --- | --- |
| `favicon.ico` | Legacy tab icon (16/32/48) |
| `favicon.svg` | Modern tab icon |
| `apple-touch-icon.png` | 180×180 iOS |
| `icon-192.png` / `icon-512.png` | PWA / Android |
| `og.png` | 1200×630 social card |
| `site.webmanifest` | Name, theme, icons |
| `robots.txt` | Allow indexing of public receipts later |
| `humans.txt` | Colophon |

HTML head (Astro layout, later):

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#12212B">
<meta name="description" content="Tell us what’s broken. We find a local engineer, stay inside your budget, and give you a receipt when it’s done.">
<meta property="og:title" content="Yaler">
<meta property="og:description" content="Delegate the outcome. Keep the mandate.">
<meta property="og:image" content="/og.png">
<meta name="twitter:card" content="summary_large_image">
```

## Motifs are sections, not ornaments

Yaler ships a set of kitchen/office motifs in `web/src/styles/global.css`: `.ticket-rail` / `.chit` (the kitchen pass), `.clock-digits` / `.clock-colon` (the service clock), `.folder` / `.dossier-sheet` / `.hole-punch-row` (the compliance folder), `.stamp` (inked status impressions), `.hand-note` (Caveat sharpie margin notes), `.receipt-sheet` / `.receipt-perf` / `.receipt-punch` (the thermal receipt), `.shuffle-papers` (verifying state). Each was built with real craft — the stamp thuds in with a blurred second ink pass, the receipt feeds out of a slot, the colon blinks, the chits tilt on the rail.

The rule that makes them read as a kitchen system rather than "cards with decorations": **a motif must be the section, not live inside a section.** A `.ticket-rail` wrapped in a `paper-card` reads as "a card with a rail in it." A `.ticket-rail` *as* the section reads as the kitchen pass. The receipt page is the model — the `.folder` wraps the `.receipt-sheet` with no `paper-card` around it. Every other page should follow that pattern: promote the motif to the section wrapper, drop the surrounding `paper-card`.

Concretely: `AgentQuotePreview` should be a ticket rail, not three stacked cards. `TimeCompare`'s `clock-digits` should escape its `paper-card`. The market stats should be a stamped ledger row, not three `paper-card rounded-xl` blocks. The evidence dossier in `MissionTimeline` should be a `folder` section, not a `folder` nested in a `paper-card`.

## Shipped UI

The Astro app must look like this document, not like an agent dashboard.

- **Page:** paper (`#F4EFE6`). Cards are raised paper, not glass.
- **Type:** Source Serif 4 for titles and the wordmark; system sans for forms and captions.
- **Mark:** `web/public/favicon.svg` (the two-stroke receipt punch). Do not replace it with a letter tile.
- **Accent:** mandate teal for success and primary actions; escalation rust only for things that need a human.
- **Operator copy:** kitchen English. Statuses are “Asking nearby engineers”, “Needs you”, “Done” — never raw enums. Model, protocol, and runtime names stay off buttons and headers.
- **Disclosure:** first visit leads with rehearsal. The live form sits under “This is a real job.” Radar, sample receipt, traces, autonomy modes, and checklists are opt-in.
- **Rehearsal:** `/rehearsal` is last Tuesday’s fridge in N1. Same chrome as a live job, labelled, nothing booked. A phase rail (Details → Looking → Quotes → Receipt) plus one mandate-voice guide line walks the user. Quotes open on the over-ceiling row. Speak the job in; hear the paper out. The only exit is **Save these rules** — never a live create. Saved rules reappear on home.
- **Quotes:** roster first. “Found this morning” cards are not bookable. Public-register line is `listed` or **not checked** — never a fake tick.
- **Sponsor APIs:** each sponsor technology (Gemini, Vapi, Exa, Apify, ElevenLabs) is surfaced as a branded `SponsorCallout` card when it fires — color-coded (Gemini=blue, Vapi=purple, Exa=emerald, Apify=orange, ElevenLabs=pink) with a live working/done status. A compact `SponsorRail` in the footer and inside the mission timeline shows the full stack at a glance, with the active sponsor lit up. This is deliberate: judges score sponsor-tool usage, and the product’s credibility comes from showing *which* AI does *what* at each step.
- **Animated receipt:** the proof receipt is the completion artifact. It prints out of a slot (thermal-printer animation), a verified stamp thuds down with a slight rotation, and fold lines fade in suggesting it was carried in a pocket. The buyer’s rating appears on the receipt. This is the thing people share.
- **District-agnostic:** the home page has a district picker (defaults to N1, stored in localStorage). Any UK postcode works. The N1/Cafe Noor story is the default rehearsal, but the product is not London-locked — the district picker makes it universal.
- **Motion:** Astro view transitions and in-app `navigate()`. No aurora, no pointer-tracking backdrop, no page reload after mandate confirm. Honor `prefers-reduced-motion`.
- **Width variation:** `Layout.astro`'s `max-w-3xl mx-auto` on `<main>` must not be a monopoly. Pages opt into `narrow` (forms, receipt), `default` (most pages), `wide` (mission detail — sticky split), or `full-bleed` (landing hero). A single narrow column across every page is what makes the app feel like a deck of cards. The constraint is one prop, not a rewrite.
- **Persistent context:** every page gets a sticky context strip that survives scroll — status, elapsed time, current stage. The mission page's `LifecycleScrubber` is the model. Context that disappears when you scroll is what makes a marketing site feel like a slide deck and an app feel like a series of forms. Generalize the scrubber.
- **Cross-island state:** islands that should respond to each other (`HeroStepFlow`, `AgentQuotePreview`, `TimeCompare`, `ActiveJobPill`, `DistrictPicker`) share state via nanostores, not React Context (which does not cross island boundaries in Astro). One store for the selected scenario, one for the active job count, one for the current district. This is what lets the landing quotes re-render for the visitor's chosen scenario and the nav pill reflect real state everywhere.
- **View transitions for real:** `<ViewTransitions />` is enabled but only `transition:persist` on the header and `transition:animate="fade"` on main are wired. Add `transition:name` to elements that appear on multiple pages — a quote card on the landing morphs into the same card on `/missions/new`; the receipt sheet morphs from the mission page's "Get the receipt" button. This makes the site feel like one continuous surface, not a series of page loads.
- **Motion discipline:** the motion library is already good (receipt print-feed, stamp thud, clock count-down, chit tilt). The feedback "make it more dynamic" is not "add more motion" — it is "fix the containers so the motion you already have reads as a kitchen system operating, not as cards that wiggle." Fix structure first; the existing motion will read differently once it is not nested inside identical `paper-card`s.

Copy helpers live in `web/src/lib/copy.ts`. Tokens live in `web/src/styles/global.css` and `web/tailwind.config.mjs`.

## Regeneration

```bash
make assets
```
