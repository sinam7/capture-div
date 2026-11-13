const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.listeners = {};
    this.style = {};
  }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); }
  attachShadow() { this.root = new Element('shadow'); return this.root; }
  setAttribute(key, value) { this[key] = value; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  remove() { this.removed = true; }
  matches() { return false; }
}

function setup({ copyFails = false, response = { success: true } } = {}) {
  const timers = new Map();
  const writes = [];
  const messages = [];
  const document = {
    documentElement: new Element('html'),
    createElement: tag => new Element(tag),
  };
  let timerId = 0;
  const context = vm.createContext({
    document, console: { log() {}, error() {} }, Blob, Uint8Array, atob,
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout: id => timers.delete(id),
    navigator: { clipboard: { write: async items => {
      if (copyFails) throw new Error('Clipboard unavailable');
      writes.push(items);
    } } },
    ClipboardItem: class { constructor(data) { this.data = data; } },
    chrome: { i18n: { getMessage: key => key } },
    Messaging: {
      sendToBackground: async message => { messages.push(message); return response; },
      onMessage() {},
    },
    ElementHighlighter: class {},
  });
  vm.runInContext(fs.readFileSync('src/content/capture-result.js', 'utf8') +
    '\nglobalThis.CaptureResult = CaptureResult;', context);
  vm.runInContext(fs.readFileSync('src/content/element-selector.js', 'utf8') +
    '\nglobalThis.ElementSelector = ElementSelector;', context);
  return { context, result: new context.CaptureResult(), timers, writes, messages };
}

const image = 'data:image/png;base64,AQID';
const controls = result => {
  const panel = result.host.root.children[1];
  return { status: panel.children[0], edit: panel.children[1].children[0] };
};

test('capture copies PNG bytes without opening an editor', async () => {
  const { result, writes, messages } = setup();
  await result.show(image);
  assert.equal(writes.length, 1);
  const blob = writes[0][0].data['image/png'];
  assert.equal(blob.type, 'image/png');
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [1, 2, 3]);
  assert.equal(messages.length, 0);
  assert.equal(controls(result).status.textContent, 'captureCopied');
});

test('copy failure is truthful and still offers the captured image to the editor', async () => {
  const { result, messages } = setup({ copyFails: true });
  await result.show(image);
  const { status, edit } = controls(result);
  assert.equal(status.textContent, 'captureCopyFailed');
  await result.openEditor(edit, status);
  assert.equal(messages[0].action, 'openEditor');
  assert.equal(messages[0].imageData, image);
  assert.equal(result.host, null);
});

test('notification expires after 5 seconds and releases image data', async () => {
  const { result, timers } = setup();
  await result.show(image);
  const host = result.host;
  const timer = [...timers.values()][0];
  assert.equal(timer.delay, 5000);
  timer.fn();
  assert.equal(host.removed, true);
  assert.equal(result.imageData, null);
  assert.equal(timers.size, 0);
});

test('hover and keyboard focus pause dismissal, leaving restarts it', async () => {
  const { result, timers } = setup();
  await result.show(image);
  const host = result.host;
  host.listeners.mouseenter();
  assert.equal(timers.size, 0);
  host.listeners.mouseleave();
  assert.equal(timers.size, 1);
  host.root.listeners.focusin();
  assert.equal(timers.size, 0);
  host.root.activeElement = {};
  host.listeners.mouseleave();
  assert.equal(timers.size, 0);
  host.root.activeElement = null;
  host.root.listeners.focusout();
  assert.equal(timers.size, 1);
});

test('Escape dismisses the notification', async () => {
  const { result } = setup();
  await result.show(image);
  let stopped = false;
  result.host.root.listeners.keydown({ key: 'Escape', stopPropagation() { stopped = true; } });
  assert.equal(stopped, true);
  assert.equal(result.host, null);
});

test('a new result removes the previous notification and timer', async () => {
  const { result, timers } = setup();
  await result.show(image);
  const oldHost = result.host;
  await result.show('data:image/png;base64,BAUG');
  assert.equal(oldHost.removed, true);
  assert.equal(timers.size, 1);
  assert.equal(result.imageData, 'data:image/png;base64,BAUG');
});

test('editor failure preserves the image and re-enables retry', async () => {
  const { result } = setup({ response: { success: false, error: 'Storage failed' } });
  await result.show(image);
  const { edit, status } = controls(result);
  await result.openEditor(edit, status);
  assert.equal(edit.disabled, false);
  assert.equal(status.textContent, 'captureEditorFailed');
  assert.equal(result.imageData, image);
});

test('double-clicking edit sends only one request', async () => {
  const { result, messages } = setup();
  await result.show(image);
  const { edit, status } = controls(result);
  await Promise.all([result.openEditor(edit, status), result.openEditor(edit, status)]);
  assert.equal(messages.length, 1);
});

test('selector captures once, deactivates, and shows the result without auto-opening', async () => {
  const { context, messages } = setup();
  let resolveCapture;
  let captures = 0;
  context.ElementCapturer = { capture: () => {
    captures++;
    return new Promise(resolve => { resolveCapture = resolve; });
  } };
  const selector = new context.ElementSelector();
  selector.selectedElement = { tagName: 'DIV' };
  selector.highlighter = { removeHighlight() {} };
  let deactivated = false;
  selector.deactivate = () => { deactivated = true; };
  const pending = selector.captureElement();
  await selector.captureElement();
  assert.equal(captures, 1);
  resolveCapture(image);
  await pending;
  assert.equal(deactivated, true);
  assert.equal(selector.isCapturing, false);
  assert.equal(selector.captureResult.imageData, image);
  assert.equal(messages.length, 0);
});

test('capture failure restores the button and permits another capture', async () => {
  const { context } = setup();
  context.ElementCapturer = { capture: async () => { throw new Error('Capture failed'); } };
  const selector = new context.ElementSelector();
  const button = {};
  selector.selectedElement = { tagName: 'DIV' };
  selector.sliderContainer = { querySelector: () => button, style: {} };
  selector.highlighter = { removeHighlight() {}, highlight() {} };
  selector.showNotification = () => {};
  await selector.captureElement();
  assert.equal(selector.isCapturing, false);
  assert.equal(button.disabled, false);
  assert.equal(selector.sliderContainer.style.display, 'block');
});

test('popup version follows the manifest instead of HTML', () => {
  const version = {};
  let ready;
  const context = vm.createContext({
    document: {
      documentElement: {},
      addEventListener: (_, fn) => { ready = fn; },
      getElementById: id => id === 'extensionVersion' ? version : { addEventListener() {} },
    },
    chrome: { i18n: {}, runtime: { getManifest: () => ({ version: '9.8.7' }) } },
    applyI18nMessages() {},
  });
  vm.runInContext(fs.readFileSync('src/popup/popup.js', 'utf8'), context);
  ready();
  assert.equal(version.textContent, 'v9.8.7');
  const html = fs.readFileSync('src/popup/popup.html', 'utf8');
  assert.match(html, /id="extensionVersion"[^>]*><\/div>/);
});

test('manifest loads result controller first and both locales contain all messages', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  const scripts = manifest.content_scripts[0].js;
  assert.ok(scripts.indexOf('src/content/capture-result.js') <
    scripts.indexOf('src/content/element-selector.js'));
  for (const locale of ['en', 'ko']) {
    const messages = JSON.parse(fs.readFileSync(`_locales/${locale}/messages.json`, 'utf8'));
    for (const key of ['captureCopied', 'captureCopyFailed', 'captureEdit',
      'captureDismiss', 'captureEditorFailed']) assert.ok(messages[key].message);
  }
});
