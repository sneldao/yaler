import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'https://yaler.persidian.com';
const OUT = path.join(__dirname, 'clips');
fs.mkdirSync(OUT, { recursive: true });

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
  page.setDefaultTimeout(20000);

  // ─── Segment 1: Landing page (15s) ───
  console.log('1. Landing page...');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }));
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(3000);

  // ─── Segment 2: Rehearsal autoplay — full flow (45s) ───
  // This auto-advances through: details → looking → quotes → receipt
  // No interaction needed — the component drives itself.
  console.log('2. Rehearsal autoplay (full flow)...');
  await page.goto(`${BASE}/rehearsal?autoplay=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000); // details phase

  // looking phase — agents sourcing
  console.log('  looking phase...');
  await page.waitForTimeout(8000); // looking phase with agent animation

  // quotes phase — over-budget stop + offer comparison
  console.log('  quotes phase (over-budget stop)...');
  await page.waitForTimeout(5000);
  // Scroll to see the offers
  await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
  await page.waitForTimeout(5000);
  // The blocked/over-budget offer is selected by default — show the stop
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(5000);

  // Now click a non-blocked offer to select it (enables the book button)
  console.log('  selecting in-budget offer...');
  // Click the second offer card (the first is the blocked one)
  const offerButtons = page.locator('button[type="button"]:not([disabled]):not(:has-text("book")):not(:has-text("Yes"))');
  const count = await offerButtons.count();
  if (count > 1) {
    // Click the second offer (index 1) — likely the in-budget one
    await offerButtons.nth(1).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(3000);
  }

  // Now try to click the book button
  console.log('  booking offer...');
  const bookBtn = page.locator('button:has-text("book"), button:has-text("Book"), button:has-text("Yes")').first();
  try {
    await bookBtn.click({ timeout: 5000 });
    await page.waitForTimeout(8000); // receipt phase
  } catch {
    // If booking fails, just wait for the receipt to appear
    console.log('  booking button not clickable, waiting...');
    await page.waitForTimeout(8000);
  }

  // ─── Segment 3: Replay — completed mission timeline (30s) ───
  // The replay pages are pre-rendered with seed data — no API needed.
  console.log('3. Replay (seed mission timeline)...');
  await page.goto(`${BASE}/replay/seed-mission-completed-01`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  // Play the replay
  const playBtn = page.locator('button:has-text("Play"), button:has-text("play"), button[aria-label*="play"], button[aria-label*="Play"]').first();
  if (await playBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await playBtn.click();
    await page.waitForTimeout(15000); // Let it play through
  } else {
    // Maybe it auto-plays or has a different control
    await page.waitForTimeout(15000);
  }
  // Scroll through the timeline
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }));
  await page.waitForTimeout(5000);

  // ─── Segment 4: Proof receipt (20s) ───
  console.log('4. Proof receipt...');
  await page.goto(`${BASE}/missions/seed-mission-completed-01/receipt`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000); // Receipt print animation
  await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
  await page.waitForTimeout(4000);
  // Click "Hear the paper"
  const hearBtn = page.locator('button:has-text("Hear"), button:has-text("Listen"), button:has-text("paper")').first();
  if (await hearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hearBtn.click();
    await page.waitForTimeout(6000);
  } else {
    await page.waitForTimeout(6000);
  }

  await page.close();
  await context.close();
  await browser.close();

  console.log('Done. Videos in:', OUT);
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.webm'));
  console.log('WebM files:', files.join(', '));
}

main().catch(console.error);
