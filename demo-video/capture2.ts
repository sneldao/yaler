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
  await page.waitForTimeout(4000); // Hero + quote fan-in
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(4000); // Ticket rail
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }));
  await page.waitForTimeout(4000); // Stats + story
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(3000);

  // ─── Segment 2: Rehearsal — speak the job (25s) ───
  console.log('2. Rehearsal...');
  await page.goto(`${BASE}/rehearsal`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const startBtn = page.locator('text=Start here').first();
  if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await startBtn.click();
    await page.waitForTimeout(3000);
  }
  // Type the job description slowly
  const input = page.locator('textarea, input[type="text"]').first();
  if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
    await input.click();
    await page.waitForTimeout(1000);
    const text = 'My commercial fridge is down in N1, budget £500, need it before lunch';
    for (const char of text) {
      await page.keyboard.type(char, { delay: 60 });
    }
    await page.waitForTimeout(3000);
  }
  // Click submit
  const submitBtn = page.locator('button:has-text("Start"), button:has-text("Confirm"), button:has-text("Extract"), button:has-text("Send"), button:has-text("Go")').first();
  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitBtn.click();
    await page.waitForTimeout(8000); // Wait for mandate extraction + animation
  }

  // ─── Segment 3: Mandate editor (20s) ───
  console.log('3. Mandate editor...');
  await page.waitForTimeout(5000); // Let the mandate settle
  await page.evaluate(() => window.scrollTo({ top: 100, behavior: 'smooth' }));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
  await page.waitForTimeout(5000);

  // ─── Segment 4: Agent works — timeline (35s) ───
  console.log('4. Timeline...');
  // Click "Start looking" or similar
  const lookBtn = page.locator('button:has-text("Start looking"), button:has-text("Start"), button:has-text("Find"), button:has-text("Go"), button:has-text("Confirm")').first();
  if (await lookBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await lookBtn.click();
    await page.waitForTimeout(3000);
  }
  // Wait for sourcing animation
  await page.waitForTimeout(10000);
  // Scroll through timeline slowly
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'smooth' }));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(7000);

  // ─── Segment 5: Offer comparison + over-budget stop (25s) ───
  console.log('5. Offers...');
  await page.waitForTimeout(5000); // Wait for offers
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'smooth' }));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(5000);
  // Try clicking an offer to see details
  const offerCard = page.locator('[class*="paper-card"], [class*="offer"]').first();
  if (await offerCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await offerCard.click();
    await page.waitForTimeout(5000);
  }
  await page.waitForTimeout(5000);

  // ─── Segment 6: Proof receipt (25s) ───
  console.log('6. Receipt...');
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
    await page.waitForTimeout(8000); // Let TTS play
  } else {
    await page.waitForTimeout(5000);
  }

  // ─── Segment 7: Replay mode (20s) ───
  console.log('7. Replay...');
  await page.goto(`${BASE}/replay/seed-mission-completed-01`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  const playBtn = page.locator('button:has-text("Play"), button:has-text("play"), button[aria-label*="play"]').first();
  if (await playBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await playBtn.click();
    await page.waitForTimeout(12000); // Let it play
  } else {
    await page.waitForTimeout(12000);
  }

  await page.close();
  await context.close();
  await browser.close();

  console.log('Done. Videos in:', OUT);
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.webm'));
  console.log('WebM files:', files.join(', '));
}

main().catch(console.error);
