import { chromium } from '/tmp/pp/node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1440, height: 900 });

  // Inject instrumentation before the app loads
  await page.addInitScript(() => {
    const root = document.createElement('div');
    root.id = 'scroll-trace';
    const logs = [];

    // Patch HTMLElement.prototype.scrollIntoView to log calls
    const origScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = function(...args) {
      const target = this;
      const rootEl = document.querySelector('.simple-weathergpt');
      logs.push({
        type: 'scrollIntoView',
        targetClass: target.className,
        targetTag: target.tagName,
        hasMessagesEndRef: !!target.closest('.simple-chat'),
        timestamp: performance.now(),
        scrollParents: []
      });
      // Walk up and find scrollable ancestors
      let el = target.parentElement;
      while (el && el !== document.body) {
        const cs = getComputedStyle(el);
        const overflowY = cs.overflowY;
        const scrollH = el.scrollHeight;
        const clientH = el.clientHeight;
        const hasOverflow = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden') && scrollH > clientH;
        logs[logs.length - 1].scrollParents.push({
          tag: el.tagName,
          className: el.className,
          overflowY,
          scrollHeight: scrollH,
          clientHeight: clientH,
          scrollTop: el.scrollTop,
          hasOverflow
        });
        el = el.parentElement;
      }
      return origScrollIntoView.apply(this, args);
    };

    // Patch scrollTop setter on .simple-weathergpt
    const origDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop');
    // We'll poll instead since scrollTop might be set via parent propagation

    window.__scrollLogs = logs;
    window.__pollInterval = setInterval(() => {
      const rootEl = document.querySelector('.simple-weathergpt');
      if (rootEl && rootEl.scrollTop > 0) {
        logs.push({
          type: 'scrollTop_changed',
          scrollTop: rootEl.scrollTop,
          scrollHeight: rootEl.scrollHeight,
          clientHeight: rootEl.clientHeight,
          timestamp: performance.now()
        });
      }
    }, 10);
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(1500);

  const logs = await page.evaluate(() => window.__scrollLogs);

  console.log('=== SCROLL TRACE LOGS ===');
  console.log(JSON.stringify(logs, null, 2));

  const rootState = await page.evaluate(() => {
    const root = document.querySelector('.simple-weathergpt');
    const header = document.querySelector('.simple-header');
    return {
      rootScrollTop: root.scrollTop,
      rootScrollHeight: root.scrollHeight,
      rootClientHeight: root.clientHeight,
      headerRect: header ? { top: header.getBoundingClientRect().top, bottom: header.getBoundingClientRect().bottom } : null,
      windowScrollY: window.scrollY
    };
  });

  console.log('=== FINAL STATE ===');
  console.log(JSON.stringify(rootState, null, 2));

  await page.screenshot({ path: 'debug_trace.png', fullPage: false });
  clearInterval(window.__pollInterval);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
