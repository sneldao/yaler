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
  page.setDefaultTimeout(15000);

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

  // ─── Segment 2: Rehearsal autoplay — FULL flow (90s) ───
  // This is self-contained: details → looking → quotes → receipt
  // No API calls needed — all stub data.
  console.log('2. Rehearsal autoplay (full flow)...');
  await page.goto(`${BASE}/rehearsal?autoplay=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000); // details phase — read the mandate

  // looking phase — three agents sourcing
  console.log('  looking phase...');
  await page.waitForTimeout(10000); // agent animation

  // quotes phase — over-budget stop + offer comparison
  console.log('  quotes phase (over-budget stop)...');
  await page.waitForTimeout(6000);
  // The blocked offer is selected by default — show the stop
  await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
  await page.waitForTimeout(6000);
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(6000);

  // Select an in-budget offer — click a non-disabled offer card button.
  // Offer cards: <button type="button" onClick={setSelectedId} disabled={isBlocked}>
  // The blocked one is disabled, so any enabled card button is in-budget.
  console.log('  selecting in-budget offer...');
  const offerCardButtons = page.locator('button[type="button"]:not([disabled])');
  const count = await offerCardButtons.count();
  console.log(`  found ${count} enabled buttons`);
  // Click the first offer card that mentions a price (skip nav/stepper buttons)
  let clickedOffer = false;
  for (let i = 0; i < count; i++) {
    const text = (await offerCardButtons.nth(i).textContent().catch(() => '')) || '';
    // Offer cards contain "Within mandate" or a £ price
    if (text.includes('£') || text.includes('Within mandate') || text.includes('availability')) {
      console.log(`  clicking offer card ${i}: ${text.slice(0, 60).replace(/\n/g, ' ')}...`);
      await offerCardButtons.nth(i).click({ timeout: 3000 }).catch(() => {});
      clickedOffer = true;
      await page.waitForTimeout(3000);
      break;
    }
  }
  if (!clickedOffer && count > 0) {
    console.log('  fallback: clicking first enabled button');
    await offerCardButtons.first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(3000);
  }

  // Now click the book button — in rehearsal it says "Yes — book this one"
  console.log('  booking...');
  const bookBtn = page.locator('button:has-text("book this one"), button:has-text("Yes — book")').first();
  try {
    await bookBtn.waitFor({ state: 'visible', timeout: 5000 });
    await bookBtn.click({ timeout: 5000 });
    console.log('  booked! waiting for receipt...');
    await page.waitForTimeout(8000); // receipt phase
  } catch {
    console.log('  book button not found, trying broader match...');
    const anyBook = page.locator('button:has-text("book"), button:has-text("Book")').first();
    try {
      await anyBook.click({ timeout: 5000 });
      console.log('  booked (broad match)! waiting for receipt...');
      await page.waitForTimeout(8000);
    } catch {
      console.log('  no book button found, waiting...');
      await page.waitForTimeout(8000);
    }
  }

  // Scroll through the receipt
  await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
  await page.waitForTimeout(5000);

  // ─── Segment 3: Demo receipt page (20s) ───
  // /missions/demo/receipt uses lastTuesdayReceipt() stub — no API needed
  console.log('3. Demo receipt page...');
  await page.goto(`${BASE}/missions/demo/receipt`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000); // receipt print animation
  await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
  await page.waitForTimeout(5000);
  // Click "Hear the paper"
  const hearBtn = page.locator('button:has-text("Hear"), button:has-text("Listen"), button:has-text("paper")').first();
  if (await hearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hearBtn.click();
    await page.waitForTimeout(5000);
  } else {
    await page.waitForTimeout(5000);
  }

  await page.close();
  await context.close();
  await browser.close();

  console.log('Done.');
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.webm'));
  console.log('WebM files:', files.join(', '));
}

main().catch(console.error);
