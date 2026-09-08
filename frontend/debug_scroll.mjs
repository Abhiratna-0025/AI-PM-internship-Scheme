import { chromium } from '/tmp/pp/node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 40000 });

  const report = await page.evaluate(() => {
    const results = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const st = el.scrollTop;
      const sb = el.scrollBottom;
      if (st > 0 || sb > 0) {
        results.push({
          tag: el.tagName,
          className: el.className,
          id: el.id || null,
          scrollTop: el.scrollTop,
          scrollLeft: el.scrollLeft,
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          offsetHeight: el.offsetHeight,
          overflowY: getComputedStyle(el).overflowY,
          overflowX: getComputedStyle(el).overflowX,
        });
      }
    }
    return results;
  });

  console.log('Elements with nonzero scrollTop/scrollBottom:');
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
