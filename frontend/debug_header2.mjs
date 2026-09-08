import { chromium } from '/tmp/pp/node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.waitForTimeout(4500);

  const afterLoad = await page.evaluate(() => {
    const root = document.querySelector('.simple-weathergpt');
    const header = document.querySelector('.simple-header');
    const main = document.querySelector('.main-content');
    const chat = document.querySelector('.simple-chat');
    const lastChild = chat && chat.lastElementChild;
    return {
      afterWait: {
        rootScrollTop: root ? root.scrollTop : null,
        headerRect: header ? { top: header.getBoundingClientRect().top, bottom: header.getBoundingClientRect().bottom, height: header.getBoundingClientRect().height, x: header.getBoundingClientRect().x, y: header.getBoundingClientRect().y } : null,
        mainRect: main ? { top: main.getBoundingClientRect().top, bottom: main.getBoundingClientRect().bottom } : null,
        chatScrollTop: chat ? chat.scrollTop : null,
        chatScrollHeight: chat ? chat.scrollHeight : null,
        chatClientHeight: chat ? chat.clientHeight : null,
        chatOverflowY: chat ? getComputedStyle(chat).overflowY : null,
        windowScrollY: window.scrollY,
        lastChildRect: lastChild ? lastChild.getBoundingClientRect() : null,
        headerFullyVisible: header ? (header.getBoundingClientRect().top >= 0 && header.getBoundingClientRect().bottom <= window.innerHeight) : null,
        rootOverflow: root ? getComputedStyle(root).overflow : null,
        mainOverflow: main ? getComputedStyle(main).overflow : null,
      }
    };
  });

  console.log(JSON.stringify(afterLoad, null, 2));
  await page.screenshot({ path: 'debug_after_load.png', fullPage: false });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
