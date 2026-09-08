import { chromium } from '/tmp/pp/node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1440, height: 900 });

  // First, test WITHOUT the fix (baseline)
  console.log('=== BASELINE (no fix) ===');
  let loaded = false;
  for (let i = 0; i < 5; i++) {
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 15000 });
      loaded = true;
      break;
    } catch (e) {
      console.log(`Retry ${i + 1}/5: ${e.message.split('\n')[0]}`);
      await page.waitForTimeout(2000);
    }
  }
  if (!loaded) throw new Error('Could not load page');
  await page.waitForTimeout(2000);

  const baseline = await page.evaluate(() => {
    const root = document.querySelector('.simple-weathergpt');
    const header = document.querySelector('.simple-header');
    return {
      rootScrollTop: root.scrollTop,
      rootScrollHeight: root.scrollHeight,
      rootClientHeight: root.clientHeight,
      headerRect: header ? { top: header.getBoundingClientRect().top, bottom: header.getBoundingClientRect().bottom } : null,
      headerVisible: header ? (header.getBoundingClientRect().top >= 0 && header.getBoundingClientRect().bottom <= window.innerHeight) : false,
      glassOrbPosition: getComputedStyle(document.querySelector('.glass-orb'))?.position,
    };
  });
  console.log('Baseline:', JSON.stringify(baseline, null, 2));
  await page.screenshot({ path: 'debug_baseline.png', fullPage: false });

  // Now apply the FIX: inject CSS and guard
  console.log('\n=== APPLYING FIX ===');

  // Fix 1: Change glass-orb position to fixed via CSS injection
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = `
      .glass-orb {
        position: fixed !important;
      }
    `;
    document.head.appendChild(style);
  });

  // Fix 2: Reload the page to pick up the JSX change (scrollIntoView guard)
  let reloaded = false;
  for (let i = 0; i < 5; i++) {
    try {
      await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
      reloaded = true;
      break;
    } catch (e) {
      console.log(`Reload retry ${i + 1}/5: ${e.message.split('\n')[0]}`);
      await page.waitForTimeout(2000);
    }
  }
  if (!reloaded) throw new Error('Could not reload page');
  await page.waitForTimeout(2000);

  const afterFix = await page.evaluate(() => {
    const root = document.querySelector('.simple-weathergpt');
    const header = document.querySelector('.simple-header');
    return {
      rootScrollTop: root.scrollTop,
      rootScrollHeight: root.scrollHeight,
      rootClientHeight: root.clientHeight,
      headerRect: header ? { top: header.getBoundingClientRect().top, bottom: header.getBoundingClientRect().bottom } : null,
      headerVisible: header ? (header.getBoundingClientRect().top >= 0 && header.getBoundingClientRect().bottom <= window.innerHeight) : false,
      glassOrbPosition: getComputedStyle(document.querySelector('.glass-orb'))?.position,
    };
  });
  console.log('After CSS fix:', JSON.stringify(afterFix, null, 2));
  await page.screenshot({ path: 'debug_after_fix.png', fullPage: false });

  await browser.close();
  console.log('\nDone.');
})().catch(e => { console.error(e); process.exit(1); });
