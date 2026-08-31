import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'https://yaler.persidian.com';
const OUT = path.join(__dirname, 'clips');
fs.mkdirSync(OUT, { recursive: true });

// Helper: wait for a selector to be visible, then wait extra for animations.
async function waitAndPause(page: any, selector: string, extraMs = 2000) {
  await page.waitForSelector(selector, { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(extraMs);
}

async function slowType(page: any, selector: string, text: string, delay = 50) {
  await page.click(selector);
  await page.waitForTimeout(500);
  for (const char of text) {
    await page.keyboard.type(char, { delay });
  }
  await page.waitForTimeout(1000);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: OUT,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  // ─── Segment 1: Landing page (problem + value prop) ───
  console.log('Capturing segment 1: Landing page...');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Let the hero load and quotes fan in
  // Scroll down slowly to show the ticket rail
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'smooth' }));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // ─── Segment 2: Rehearsal — speak the job ───
  console.log('Capturing segment 2: Rehearsal...');
  await page.goto(`${BASE}/rehearsal`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  // Click "Start here — try a rehearsal"
  const startBtn = page.locator('text=Start here').first();
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForTimeout(2000);
  }
  // Type the job description
  const goalInput = page.locator('textarea, input[type="text"]').first();
  if (await goalInput.isVisible()) {
    await slowType(page, 'textarea, input[type="text"]', 'My commercial fridge is down in N1, budget £500, need it before lunch', 40);
    await page.waitForTimeout(2000);
  }
  // Click submit/confirm
  const submitBtn = page.locator('button:has-text("Start"), button:has-text("Confirm"), button:has-text("Extract"), button:has-text("Send")').first();
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    await page.waitForTimeout(4000); // Wait for mandate extraction
  }

  // ─── Segment 3: Mandate editor ───
  console.log('Capturing segment 3: Mandate editor...');
  await page.waitForTimeout(3000); // Let the mandate appear
  // Scroll to show the mandate fields
  await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
  await page.waitForTimeout(3000);

  // ─── Segment 4: Agent works (timeline) ───
  console.log('Capturing segment 4: Timeline...');
  // Click "Start looking" or similar to begin sourcing
  const lookBtn = page.locator('button:has-text("Start looking"), button:has-text("Start"), button:has-text("Go"), button:has-text("Find")').first();
  if (await lookBtn.isVisible()) {
    await lookBtn.click();
    await page.waitForTimeout(2000);
  }
  // Wait for timeline events to populate
  await page.waitForTimeout(8000);
  // Scroll through the timeline
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }));
  await page.waitForTimeout(3000);

  // ─── Segment 5: Offer comparison + over-budget stop ───
  console.log('Capturing segment 5: Offers + over-budget stop...');
  await page.waitForTimeout(5000); // Wait for offers to load
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'smooth' }));
  await page.waitForTimeout(3000);
  // Scroll back up to show the offers
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(4000);

  // ─── Segment 6: Proof receipt ───
  console.log('Capturing segment 6: Proof receipt...');
  await page.goto(`${BASE}/missions/seed-mission-completed-01/receipt`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000); // Let the receipt print animation play
  await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(3000);
  // Click "Hear the paper" if visible
  const hearBtn = page.locator('button:has-text("Hear"), button:has-text("Listen"), button:has-text("paper")').first();
  if (await hearBtn.isVisible()) {
    await hearBtn.click();
    await page.waitForTimeout(5000); // Let TTS play
  }

  // ─── Segment 7: Replay mode ───
  console.log('Capturing segment 7: Replay...');
  await page.goto(`${BASE}/replay/seed-mission-completed-01`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  // Try to interact with the replay scrubber
  const playBtn = page.locator('button:has-text("Play"), button:has-text("play")').first();
  if (await playBtn.isVisible()) {
    await playBtn.click();
    await page.waitForTimeout(8000); // Let it play for a bit
  } else {
    await page.waitForTimeout(5000);
  }

  // ─── Segment 8: Architecture diagram ───
  console.log('Capturing segment 8: Architecture diagram...');
  await page.goto(`${BASE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // Take a screenshot of the architecture diagram from the repo
  await page.screenshot({ path: path.join(OUT, 'architecture.png'), fullPage: false });

  // Close the context to finalize the video
  await page.close();
  await context.close();
  await browser.close();

  console.log('All segments captured. Videos in:', OUT);
  const files = fs.readdirSync(OUT);
  console.log('Files:', files.filter(f => f.endsWith('.webm')).join(', '));
}

main().catch(console.error);
