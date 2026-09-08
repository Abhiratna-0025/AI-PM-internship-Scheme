import { chromium } from '/tmp/pp/node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 40000 });

  const heights = await page.evaluate(() => {
    const root = document.querySelector('.simple-weathergpt');
    const main = document.querySelector('.main-content');
    const header = document.querySelector('.simple-header');
    const sidebar = document.querySelector('aside.sidebar');
    const dashboard = document.querySelector('.dashboard-view-container');
    const chat = document.querySelector('.simple-chat');
    const input = document.querySelector('.input-area');
    const footer = document.querySelector('.simple-footer');
    const lastChildOfChat = chat && chat.lastElementChild;

    const childrenOfRoot = Array.from(root.children).map(el => ({
      tag: el.tagName,
      className: el.className,
      offsetHeight: el.offsetHeight,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      marginTop: parseFloat(getComputedStyle(el).marginTop) || 0,
      marginBottom: parseFloat(getComputedStyle(el).marginBottom) || 0,
      borderTop: parseFloat(getComputedStyle(el).borderTopWidth) || 0,
      borderBottom: parseFloat(getComputedStyle(el).borderBottomWidth) || 0,
      paddingTop: parseFloat(getComputedStyle(el).paddingTop) || 0,
      paddingBottom: parseFloat(getComputedStyle(el).paddingBottom) || 0,
    }));

    return {
      root: {
        offsetHeight: root.offsetHeight,
        clientHeight: root.clientHeight,
        scrollHeight: root.scrollHeight,
        overflowY: getComputedStyle(root).overflowY,
      },
      main: {
        offsetHeight: main.offsetHeight,
        clientHeight: main.clientHeight,
        scrollHeight: main.scrollHeight,
        borderTop: parseFloat(getComputedStyle(main).borderTopWidth) || 0,
        borderBottom: parseFloat(getComputedStyle(main).borderBottomWidth) || 0,
        paddingTop: parseFloat(getComputedStyle(main).paddingTop) || 0,
        paddingBottom: parseFloat(getComputedStyle(main).paddingBottom) || 0,
      },
      header: {
        offsetHeight: header.offsetHeight,
        clientHeight: header.clientHeight,
        scrollHeight: header.scrollHeight,
        marginTop: parseFloat(getComputedStyle(header).marginTop) || 0,
        marginBottom: parseFloat(getComputedStyle(header).marginBottom) || 0,
      },
      childrenOfRoot,
      chat: {
        offsetHeight: chat.offsetHeight,
        clientHeight: chat.clientHeight,
        scrollHeight: chat.scrollHeight,
        flex: getComputedStyle(chat).flex,
      },
      input: {
        offsetHeight: input.offsetHeight,
        clientHeight: input.clientHeight,
      },
      footer: {
        offsetHeight: footer.offsetHeight,
        clientHeight: footer.clientHeight,
        display: getComputedStyle(footer).display,
      },
      sidebar: {
        offsetHeight: sidebar.offsetHeight,
        clientHeight: sidebar.clientHeight,
        top: parseFloat(getComputedStyle(sidebar).top) || 0,
      },
    };
  });

  console.log(JSON.stringify(heights, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
