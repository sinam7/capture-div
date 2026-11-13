const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');

const output = path.resolve('test-results');
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end('<!doctype html><title>Capture div E2E</title><style>body{margin:40px;font:20px sans-serif}#target{width:320px;height:180px;background:#275bd1;color:white;display:grid;place-items:center}</style><div id="target">Clipboard capture test</div>');
});
const os = (...args) => execFileSync('xdotool', args, { timeout: 10000 });
let context;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  context = await chromium.launchPersistentContext(path.join(output, 'profile'), {
    headless: false,
    viewport: null,
    args: [
      '--no-sandbox', '--window-size=1280,900', '--force-device-scale-factor=1',
      '--disable-extensions-except=' + process.cwd(),
      '--load-extension=' + process.cwd(),
    ],
  });
  context.on('page', p => p.on('pageerror', err => {
    fs.appendFileSync(path.join(output, 'browser-errors.txt'), String(err) + '\n');
  }));
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:' + server.address().port);
  await page.bringToFront();
  await page.waitForTimeout(1000);
  page.on('console', msg => console.log('PAGE:', msg.text()));
  const windowId = os('search', '--onlyvisible', '--name', 'Capture div E2E').toString().trim().split('\n').pop();
  os('windowfocus', '--sync', windowId);
  await page.evaluate(() => document.addEventListener('click', event => console.log('OS CLICK', event.clientX, event.clientY, event.target.tagName), true));

  async function startSelection() {
    await worker.evaluate(async url => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(t => t.url === url);
      await chrome.tabs.sendMessage(tab.id, { action: 'startSelection' });
    }, page.url());
  }
  async function moveTo(locator) {
    const box = await locator.boundingBox();
    assert.ok(box, 'element has screen bounds');
    const offset = await page.evaluate(() => ({
      x: window.screenX, y: window.screenY + window.outerHeight - window.innerHeight,
    }));
    console.log('OS geometry', JSON.stringify({box, offset}));
    os('mousemove', String(Math.round(offset.x + box.x + box.width / 2)),
      String(Math.round(offset.y + box.y + box.height / 2)));
  }
  async function capture() {
    await startSelection();
    await moveTo(page.locator('#target'));
    os('click', '1');
    await page.locator('.element-selector__slider').waitFor();
    os('key', 'Return');
    await page.locator('.element-selector__capture-result').waitFor();
  }
  await capture();
  assert.equal(context.pages().filter(p => p.url().includes('/src/editor/')).length, 0);
  const png = execFileSync('xclip', ['-selection', 'clipboard', '-t', 'image/png', '-o'],
    { timeout: 10000, maxBuffer: 10 * 1024 * 1024 });
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 320);
  assert.equal(png.readUInt32BE(20), 180);
  fs.writeFileSync(path.join(output, 'clipboard.png'), png);
  const toast = page.locator('.element-selector__capture-result');
  await moveTo(toast);
  await page.screenshot({ path: path.join(output, 'capture-toast.png') });
  await page.waitForTimeout(5500);
  assert.equal(await toast.count(), 1, 'hover keeps notification visible');
  // The fixture has no focusable controls; the first Tab enters the edit button.
  os('key', 'Tab');
  const editorPromise = context.waitForEvent('page');
  os('key', 'Return');
  const editor = await editorPromise;
  await editor.waitForURL('**/src/editor/index.html');
  await editor.waitForFunction(() => window.editor?.canvas?.width === 320);
  await editor.screenshot({ path: path.join(output, 'editor.png') });
  assert.equal(await toast.count(), 0);
  // Verify the popup renders the installed manifest's version.
  const popup = await context.newPage();
  await popup.goto('chrome-extension://' + extensionId + '/src/popup/popup.html');
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  assert.equal(await popup.locator('#extensionVersion').textContent(), 'v' + manifest.version);
  await popup.screenshot({ path: path.join(output, 'popup.png') });
  await popup.close();
  await editor.close();
  await page.bringToFront();
  await capture();
  await moveTo(page.locator('#target'));
  await toast.waitFor({ state: 'detached', timeout: 8000 });
  fs.writeFileSync(path.join(output, 'result.txt'),
    'PASS: OS mouse/keyboard capture, PNG clipboard 320x180, no automatic editor, hover pause, optional editor, popup version, auto-dismiss.\n');
  console.log(fs.readFileSync(path.join(output, 'result.txt'), 'utf8'));
})().catch(async error => {
  fs.writeFileSync(path.join(output, 'failure.txt'), error.stack);
  if (context) {
    for (const [i, page] of context.pages().entries()) {
      const shot = await page.screenshot({ path: path.join(output, 'failure-' + i + '.png') }).catch(() => null);
      if (shot) console.log('SCREENSHOT_BASE64:' + shot.toString('base64'));
    }
  }
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (context) await context.close();
  server.close();
  // Browser profiles may contain captured images; retain only explicit test evidence.
  fs.rmSync(path.join(output, 'profile'), { recursive: true, force: true });
});
