const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = process.env.CAPTURER_SOURCE || 'src/content/capturer.js';
function setup() {
  const draws = [];
  const canvases = [];
  const document = {
    body: {}, documentElement: {}, querySelectorAll: () => [],
    createElement() {
      const canvas = { width: 0, height: 0,
        getContext: () => ({ drawImage: (...args) => draws.push(args) }),
        toDataURL() { return this.width && this.height ? 'data:image/png;base64,fixture' : 'data:,'; },
      };
      canvases.push(canvas);
      return canvas;
    },
  };
  const window = { innerHeight: 600, innerWidth: 800, devicePixelRatio: 1,
    scrollX: 0, scrollY: 0, scrollTo() {},
    getComputedStyle: el => ({ position: el.position || 'static', overflowY: el.overflowY || 'visible' }),
  };
  const context = vm.createContext({ document, window, console: { log() {}, warn() {}, error() {} },
    Image: class { set src(value) { this.onload(); } },
  });
  const Capturer = vm.runInContext(fs.readFileSync(source, 'utf8') + '\nElementCapturer;', context);
  Capturer.waitForDOMUpdate = Capturer.delay = async () => {};
  const element = {
    querySelectorAll: () => [],
    tagName: 'DIV', style: {}, overflowY: 'auto', clientTop: 2, clientLeft: 2,
    scrollHeight: 650, clientHeight: 200, clientWidth: 100, scrollWidth: 100,
    scrollTop: 37, scrollLeft: 4, parentElement: document.body,
    contains(other) { return other === this; },
    scrollTo({ top, left }) { this.scrollTop = Math.max(0, Math.min(450, top)); this.scrollLeft = left; },
    getBoundingClientRect() { return { left: 20, top: 100, bottom: 304, width: 104, height: 204 }; },
  };
  const tiles = [];
  Capturer.captureSingleViewport = async (el, rect, height) => {
    tiles.push({ scrollTop: element.scrollTop, rect, height });
    return 'data:image/png;base64,tile';
  };
  Capturer.loadImage = async data => ({ data });
  return { Capturer, element, window, document, tiles, draws, canvases };
}
test('#21 scrolls the selected panel and handles the clamped final overlap', async () => {
  const { Capturer, element, tiles, draws, canvases } = setup();
  await Capturer.captureWithNativeAPI(element);
  assert.deepEqual(tiles.map(t => t.scrollTop), [0, 200, 400, 450]);
  assert.deepEqual(tiles.map(t => t.height), [200, 200, 200, 50]);
  assert.deepEqual(tiles.map(t => t.rect.top), [102, 102, 102, 252]);
  assert.deepEqual(draws.map(d => d[2]), [0, 200, 400, 600]);
  assert.equal(canvases[0].height, 650);
  assert.equal(element.scrollTop, 37);
  assert.equal(element.scrollLeft, 4);
});
test('#21 selects inner scrolling even when content is shorter than the window', async () => {
  const { Capturer, element, tiles } = setup();
  element.scrollHeight = 400;
  await Capturer.captureWithNativeAPI(element);
  assert.equal(tiles.length, 2);
});
test('#21 scrolls an ancestor when the selected content is inside a panel', async () => {
  const { Capturer, element: panel, document, tiles } = setup();
  const child = { parentElement: panel, style: {}, querySelectorAll: () => [],
    contains: other => other === child,
    getBoundingClientRect: () => ({ left: 22, top: 102 - panel.scrollTop,
      width: 100, height: 650, bottom: 752 - panel.scrollTop }),
  };
  assert.equal(Capturer.findScrollContainer(child), panel);
  await Capturer.captureWithNativeAPI(child);
  assert.deepEqual(tiles.map(t => t.height), [200, 200, 200, 50]);
  assert.equal(panel.scrollTop, 37);
});
test('#21 restores scroll and hidden elements after capture failure', async () => {
  const { Capturer, element } = setup();
  let restored = false;
  Capturer.restoreFixedStickyElements = () => { restored = true; };
  Capturer.captureSingleViewport = async () => { throw new Error('capture failed'); };
  await assert.rejects(Capturer.captureWithNativeAPI(element), /capture failed/);
  assert.equal(element.scrollTop, 37);
  assert.equal(element.scrollLeft, 4);
  assert.equal(restored, true);
});
test('#21 rejects unreachable content rather than duplicating a panel', async () => {
  const { Capturer, element } = setup();
  element.scrollTo = () => { element.scrollTop = 0; };
  await assert.rejects(Capturer.captureWithNativeAPI(element), /cannot be brought into view/);
});
test('#20 keeps the modal, its ancestor and selected descendants visible', () => {
  const { Capturer, element, document } = setup();
  const child = { style: {}, position: 'sticky', contains: () => false };
  const ancestor = { style: {}, position: 'fixed', contains: el => el === element };
  const unrelated = { style: { display: '', visibility: '', position: '' },
    position: 'fixed', contains: () => false };
  element.position = 'fixed';
  element.contains = el => el === element || el === child;
  document.querySelectorAll = () => [ancestor, element, child, unrelated];
  const hidden = Capturer.hideAllFixedStickyElements(element);
  assert.equal(hidden.length, 1);
  assert.equal(hidden[0].element, unrelated);
  assert.equal(element.style.display, undefined);
  Capturer.restoreFixedStickyElements(hidden);
  assert.equal(unrelated.style.display, '');
});
test('#20 rejects zero-sized crops before creating an empty image', async () => {
  const { Capturer } = setup();
  // Use the real crop method; the test setup replaces only viewport capture.
  await assert.rejects(Capturer.cropImage('data:image/png;base64,x',
    { left: 0, top: 0, width: 0 }, 1, 10), /empty or invalid dimensions/);
});
test('#20 routes an empty canvas result through capture failure cleanup', async () => {
  const { Capturer, element } = setup();
  let restored = false;
  Capturer.hideAllOverlays = Capturer.scrollElementIntoFullView = async () => {};
  Capturer.captureWithNativeAPI = async () => 'data:,';
  Capturer.restoreOverlays = async () => { restored = true; };
  await assert.rejects(Capturer.capture(element), /empty image/);
  assert.equal(restored, true);
});
test('normal page elements retain the existing single viewport path', async () => {
  const { Capturer, element, tiles } = setup();
  element.overflowY = 'visible';
  Capturer.getRealContentHeight = () => 204;
  await Capturer.captureWithNativeAPI(element);
  assert.equal(tiles.length, 1);
  assert.equal(tiles[0].height, 204);
});
