// Run with Node and Playwright installed. BROWSER_EXECUTABLE may select a local Chromium.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const source = fs.readFileSync(process.env.CAPTURER_SOURCE || 'src/content/capturer.js', 'utf8');
async function fixture(t, html, dpr = 1) {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: dpr });
  await page.setContent(html);
  await page.exposeFunction('captureScreenshot', async () => ({ success: true,
    imageData: 'data:image/png;base64,' + (await page.screenshot()).toString('base64') }));
  await page.addScriptTag({ content: source + `
    window.Capturer = ElementCapturer;
    window.Messaging = { sendToBackground: () => window.captureScreenshot() };
  ` });
  return page;
}
async function capture(page, selector) {
  return page.evaluate(async selector => {
    const target = document.querySelector(selector);
    const originalTop = target.scrollTop;
    const data = await Capturer.capture(target);
    const image = await Capturer.loadImage(data);
    const canvas = document.createElement('canvas');
    canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const colors = [];
    for (let y = 25; y < image.height / devicePixelRatio; y += 50) {
      colors.push(Array.from(context.getImageData(10 * devicePixelRatio,
        y * devicePixelRatio, 1, 1).data).slice(0, 3));
    }
    return { width: image.width, height: image.height, colors,
      restored: target.scrollTop === originalTop, dataLength: data.length };
  }, selector);
}
const rows = Array.from({ length: 13 }, (_, i) =>
  `<div style="height:50px;background:rgb(${i * 15},${255 - i * 15},80)"></div>`).join('');
for (const dpr of [1, 2]) {
  test(`#21 actual Chromium pixels: selected panel, DPR ${dpr}`, async t => {
    const page = await fixture(t, `<div id="panel" style="position:absolute;top:100px;
      left:20px;width:100px;height:200px;overflow-y:auto;border:2px solid black;
      scroll-behavior:smooth">${rows}</div>`, dpr);
    await page.evaluate(() => document.querySelector('#panel').scrollTo({ top: 37, behavior: 'instant' }));
    const result = await capture(page, '#panel');
    assert.equal(result.height, 650 * dpr);
    assert.equal(result.restored, true);
    assert.deepEqual(result.colors, Array.from({ length: 13 }, (_, i) => [i * 15, 255 - i * 15, 80]));
  });
}
test('#21 actual Chromium pixels: tall child in a fixed scroll panel', async t => {
  const page = await fixture(t, `<div style="position:fixed;top:100px;left:20px;
    width:100px;height:200px;overflow:auto"><div id="content">${rows}</div></div>`);
  const result = await capture(page, '#content');
  assert.equal(result.height, 650);
  assert.deepEqual(result.colors, Array.from({ length: 13 }, (_, i) => [i * 15, 255 - i * 15, 80]));
});
test('#20 actual Chromium pixels: fixed modal stays visible and produces a decodable PNG', async t => {
  const page = await fixture(t, `<div style="position:fixed;inset:0;background:#999">
    <div id="modal" style="position:fixed;top:100px;left:100px;width:200px;
    height:200px;background:rgb(10,20,30)">Modal</div></div>`);
  const result = await capture(page, '#modal');
  assert.equal(result.width, 200);
  assert.equal(result.height, 200);
  assert.ok(result.dataLength > 6);
  assert.deepEqual(result.colors, Array.from({ length: 4 }, () => [10, 20, 30]));
});

test('#21 wrapper containing an inner scrolling div includes all inner rows', async t => {
  const page = await fixture(t, `<div id="wrapper" style="position:absolute;top:100px;
    left:20px;width:100px"><div style="height:200px;overflow:auto">${rows}</div></div>`);
  const result = await capture(page, '#wrapper');
  assert.equal(result.height, 650);
  assert.deepEqual(result.colors, Array.from({ length: 13 }, (_, i) => [i * 15, 255 - i * 15, 80]));
});

test('#21 Naver Mail #mail_list_wrap flex layout and translated scroll layer', async t => {
  const page = await fixture(t, `<style>
    html,body { margin:0; height:100%; overflow:hidden }
    .wrap {position:absolute;inset:0;min-width:1024px}
    .container {position:absolute;top:55px;bottom:0;right:0;left:251px}
    .contents {display:flex;flex-direction:column;height:100%}
    .contents_area {position:relative;flex:1 1 0%;display:flex;flex-direction:column;
      min-height:0;overflow:auto}
    .mail_list_wrap {overflow-x:hidden;transform:translateZ(0);position:relative;
      flex:1 1 0%;min-height:0;display:flex;flex-direction:column}
    .mail_list {flex:1 1 0%;overflow-x:hidden;margin:0;padding:0}
    .pagination {flex:0 0 50px;background:rgb(20,30,40)}
  </style><div class="wrap"><div class="container"><div class="contents">
    <div style="flex:0 0 44px"></div><div style="flex:0 0 60px"></div>
    <div style="flex:0 0 40px"></div><div class="contents_area is_normal">
    <div class="mail_list_wrap" id="mail_list_wrap"><ul class="mail_list">${rows}</ul>
    <div class="pagination"></div></div></div></div></div></div>`);
  await page.setViewportSize({width:1280,height:600});
  const geometry = await page.evaluate(() => {
    const el = document.querySelector('#mail_list_wrap');
    el.querySelector('.mail_list').scrollTop = 37;
    return {overflowY:getComputedStyle(el).overflowY,height:el.clientHeight,
      scrollHeight:el.scrollHeight,owner:Capturer.findScrollContainer(el)?.className};
  });
  console.log('Naver layout geometry:', geometry);
  const result = await capture(page, '#mail_list_wrap');
  assert.equal(result.height,700);
  assert.equal(result.restored,true);
  assert.deepEqual(result.colors,[...Array.from({length:13},(_,i)=>[i*15,255-i*15,80]),[20,30,40]]);
  assert.equal(await page.locator('.mail_list').evaluate(el => el.scrollTop),37);
});
