import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 40000 });

  await page.waitForFunction(() => {
    return !!document.querySelector('.simple-weathergpt');
  }, { timeout: 15000 });

  const Metrics = await page.evaluate(() => {
    const sel = (s) => document.querySelector(s);

    const header = sel('.simple-header');
    const main = sel('.main-content');
    const root = sel('.simple-weathergpt');
    const sidebar = sel('aside.sidebar');
    const dashboard = sel('.dashboard-view-container');
    const chat = sel('.simple-chat');
    const input = sel('.input-area');
    const footer = sel('.simple-footer');
    const html = document.documentElement;
    const body = document.body;

    const rects = {
      header: header ? header.getBoundingClientRect() : null,
      main: main ? main.getBoundingClientRect() : null,
      root: root ? root.getBoundingClientRect() : null,
      sidebar: sidebar ? sidebar.getBoundingClientRect() : null,
      dashboard: dashboard ? dashboard.getBoundingClientRect() : null,
      chat: chat ? chat.getBoundingClientRect() : null,
      input: input ? input.getBoundingClientRect() : null,
      footer: footer ? footer.getBoundingClientRect() : null,
    };

    const styles = {
      header: header ? {
        position: getComputedStyle(header).position,
        display: getComputedStyle(header).display,
        visibility: getComputedStyle(header).visibility,
        opacity: getComputedStyle(header).opacity,
        overflow: getComputedStyle(header).overflow,
        overflowY: getComputedStyle(header).overflowY,
        overflowX: getComputedStyle(header).overflowX,
        top: getComputedStyle(header).top,
        left: getComputedStyle(header).left,
        transform: getComputedStyle(header).transform,
        marginTop: getComputedStyle(header).marginTop,
        marginBottom: getComputedStyle(header).marginBottom,
        flexShrink: getComputedStyle(header).flexShrink,
        flexGrow: getComputedStyle(header).flexGrow,
        height: getComputedStyle(header).height,
        maxHeight: getComputedStyle(header).maxHeight,
        minHeight: getComputedStyle(header).minHeight,
        width: getComputedStyle(header).width,
        boxSizing: getComputedStyle(header).boxSizing,
      } : null,
      main: main ? {
        position: getComputedStyle(main).position,
        display: getComputedStyle(main).display,
        overflow: getComputedStyle(main).overflow,
        overflowY: getComputedStyle(main).overflowY,
        overflowX: getComputedStyle(main).overflowX,
        transform: getComputedStyle(main).transform,
        top: getComputedStyle(main).top,
        left: getComputedStyle(main).left,
        marginTop: getComputedStyle(main).marginTop,
        paddingTop: getComputedStyle(main).paddingTop,
        paddingBottom: getComputedStyle(main).paddingBottom,
      } : null,
      root: root ? {
        position: getComputedStyle(root).position,
        display: getComputedStyle(root).display,
        overflow: getComputedStyle(root).overflow,
        overflowY: getComputedStyle(root).overflowY,
        overflowX: getComputedStyle(root).overflowX,
        height: getComputedStyle(root).height,
        maxHeight: getComputedStyle(root).maxHeight,
        transform: getComputedStyle(root).transform,
      } : null,
    };

    const scroll = {
      windowScrollY: window.scrollY,
      htmlScrollTop: html.scrollTop,
      bodyScrollTop: body.scrollTop,
      mainScrollTop: main ? main.scrollTop : null,
      rootScrollTop: root ? root.scrollTop : null,
      chatScrollTop: chat ? chat.scrollTop : null,
    };

    const viewport = {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };

    const computedFlexOnMain = main ? {
      flexDirection: getComputedStyle(main).flexDirection,
      alignItems: getComputedStyle(main).alignItems,
      justifyContent: getComputedStyle(main).justifyContent,
    } : null;

    return {
      viewport,
      rects,
      styles,
      scroll,
      flexOnMain: computedFlexOnMain,
    };
  });

  console.log(JSON.stringify(Metrics, null, 2));

  await page.screenshot({ path: 'debug_header.png', fullPage: false });
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
