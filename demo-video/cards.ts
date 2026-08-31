import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.join(__dirname, 'clips');
const CARDS = path.join(__dirname, 'cards');
fs.mkdirSync(CARDS, { recursive: true });

const cards = [
  { id: 'intro', title: 'Yaler', subtitle: 'Autonomous kitchen repair agent', url: 'yaler.persidian.com', duration: 5, dark: false },
  { id: 'problem', title: 'The Problem', subtitle: 'Independent kitchens lose £1,000s/day when kit breaks', url: '', duration: 4, dark: false },
  { id: 'speak', title: 'Speak the Job', subtitle: 'Gemini 3.5 Flash extracts the mandate', url: '', duration: 4, dark: false },
  { id: 'agent', title: 'The Agent Works', subtitle: 'Three AI supplier agents source quotes', url: '', duration: 4, dark: false },
  { id: 'stop', title: 'The Over-Budget Stop', subtitle: 'The agent refuses to break your rules', url: '', duration: 4, dark: false },
  { id: 'hear', title: 'Hear the Paper', subtitle: 'ElevenLabs reads the proof receipt', url: '', duration: 4, dark: false },
  { id: 'replay', title: 'Replay Mode', subtitle: 'Scrub the full mission lifecycle', url: '', duration: 4, dark: false },
  { id: 'cloud', title: 'Backend on Google Cloud', subtitle: 'Live Cloud Run endpoint · Gemini 3.5 Flash', url: '', duration: 4, dark: false },
  { id: 'stack', title: 'The Stack', subtitle: 'Architecture diagram', url: '', duration: 4, dark: false },
  { id: 'close', title: 'Yaler', subtitle: 'Delegate the outcome. Keep the mandate.', url: 'github.com/sneldao/yaler', duration: 6, dark: false },
];

// Terminal card for curl proof
const terminalCard = {
  id: 'terminal',
  html: `<!DOCTYPE html><html><head><style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 1920px; height: 1080px; background: #0D161D; color: #E8E2DA;
           font-family: 'Space Mono', 'Courier New', monospace; padding: 80px;
           display: flex; flex-direction: column; gap: 8px; }
    .cmd { color: #E8E2DA; font-size: 24px; }
    .resp { color: #4F9E96; font-size: 22px; padding-left: 20px; }
    .resp-tight { color: #4F9E96; font-size: 20px; padding-left: 20px; }
    .sep { height: 20px; }
    .meta { color: #E8E2DA; font-size: 22px; font-family: Georgia, serif; margin-top: 40px; line-height: 1.8; }
    .accent { color: #4F9E96; }
  </style></head><body>
    <div class="cmd">$ curl -s https://yaler-backend-48617502162.europe-west2.run.app/health</div>
    <div class="resp">{"service":"yaler-agent","status":"ok"}</div>
    <div class="sep"></div>
    <div class="cmd">$ curl -s -X POST .../api/missions \\</div>
    <div class="cmd">  -H "Content-Type: application/json" \\</div>
    <div class="cmd">  -d '{"goal":"Fridge down in N1, budget £500"}'</div>
    <div class="resp-tight">{"id":"m_1788...","status":"DRAFT","mandate":{</div>
    <div class="resp-tight">  "budget":{"maxAmount":500,"currency":"GBP"},</div>
    <div class="resp-tight">  "serviceCategory":"refrigeration",</div>
    <div class="resp-tight">  "serviceArea":{"postalDistrict":"N1","radiusKm":10},</div>
    <div class="resp-tight">  "allowedActions":["SOURCE","REQUEST_OFFER","COMMIT"]</div>
    <div class="resp-tight">}}</div>
    <div class="meta">
      <span class="accent">Backend:</span> Go on Cloud Run (europe-west2)<br>
      <span class="accent">AI:</span> Gemini 3.5 Flash via google.golang.org/genai<br>
      <span class="accent">State:</span> Firestore &nbsp; <span class="accent">Queue:</span> Cloud Tasks &nbsp; <span class="accent">Media:</span> GCS
    </div>
  </body></html>`,
};

function cardHtml(card: typeof cards[0]): string {
  const bg = card.dark ? '#0D161D' : '#F4EFE6';
  const titleColor = card.dark ? '#E8E2DA' : '#12213B';
  const subColor = card.dark ? '#158 148 138' : '#5C5348';
  const accentColor = '#2A6F6A';
  return `<!DOCTYPE html><html><head>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&family=Space+Mono:wght@400;700&display=swap">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { width: 1920px; height: 1080px; background: ${bg};
             display: flex; flex-direction: column; align-items: center; justify-content: center;
             gap: 20px; }
      h1 { font-family: 'Source Serif 4', Georgia, serif; font-size: 72px; font-weight: 700;
           color: ${titleColor}; letter-spacing: -0.02em; }
      p { font-family: 'Source Serif 4', Georgia, serif; font-size: 32px; font-weight: 400;
          color: rgb(${subColor}); max-width: 1200px; text-align: center; line-height: 1.4; }
      .url { font-family: 'Space Mono', 'Courier New', monospace; font-size: 20px;
             color: ${accentColor}; margin-top: 40px; }
    </style></head><body>
      <h1>${card.title}</h1>
      <p>${card.subtitle}</p>
      ${card.url ? `<div class="url">${card.url}</div>` : ''}
    </body></html>`;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Capture all title cards as PNGs
  for (const card of cards) {
    console.log(`Creating card: ${card.id}...`);
    await page.setContent(cardHtml(card), { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500); // Wait for fonts to load
    await page.screenshot({ path: path.join(CARDS, `${card.id}.png`) });
  }

  // Capture terminal card
  console.log('Creating terminal card...');
  await page.setContent(terminalCard.html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(CARDS, 'terminal.png') });

  await browser.close();
  console.log('All cards captured to:', CARDS);
  console.log('Files:', fs.readdirSync(CARDS).join(', '));
}

main().catch(console.error);
