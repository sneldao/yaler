# Brand

Yaler should look like a receipt, not a chatbot. Dark ink, warm paper, one policy node.

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

## Shipped UI

The Astro app must look like this document, not like an agent dashboard.

- **Page:** paper (`#F4EFE6`). Cards are raised paper, not glass.
- **Type:** Source Serif 4 for titles and the wordmark; system sans for forms and captions.
- **Mark:** `web/public/favicon.svg` (the two-stroke receipt punch). Do not replace it with a letter tile.
- **Accent:** mandate teal for success and primary actions; escalation rust only for things that need a human.
- **Operator copy:** kitchen English. Statuses are “Asking nearby engineers”, “Needs you”, “Done” — never raw enums. Model, protocol, and runtime names stay off buttons and headers.
- **Disclosure:** first visit leads with rehearsal. The live form sits under “This is a real job.” Radar, sample receipt, traces, autonomy modes, and checklists are opt-in.
- **Rehearsal:** `/rehearsal` is last Tuesday’s fridge in N1. Same chrome as a live job, labelled, nothing booked. A phase rail (Details → Looking → Quotes → Receipt) plus one mandate-voice guide line walks the user. Quotes open on the over-ceiling row. The only exit is **Save these rules** — never a live create. Saved rules reappear on home.
- **Motion:** Astro view transitions and in-app `navigate()`. No aurora, no pointer-tracking backdrop, no page reload after mandate confirm. Honor `prefers-reduced-motion`.

Copy helpers live in `web/src/lib/copy.ts`. Tokens live in `web/src/styles/global.css` and `web/tailwind.config.mjs`.

## Regeneration

```bash
make assets
```
