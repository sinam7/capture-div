/** Copies a capture and offers optional editing without leaving the page. */
class CaptureResult {
  static DISMISS_DELAY = 5000;

  constructor() {
    this.host = null;
    this.timer = null;
    this.imageData = null;
  }

  /** Releases the previous capture and removes its notification. */
  dismiss() {
    clearTimeout(this.timer);
    this.timer = null;
    this.host?.remove();
    this.host = null;
    this.imageData = null;
  }

  /** @param {string} imageData - PNG data URL returned by the capturer. */
  async show(imageData) {
    this.dismiss();
    this.imageData = imageData;
    let copied = false;
    try {
      // Decode locally: fetching a data URL can be blocked by the page's CSP.
      const bytes = Uint8Array.from(atob(imageData.split(',')[1]), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'image/png' });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      copied = true;
    } catch (error) {
      console.error('[CaptureResult] Clipboard copy failed:', error);
    }
    // A new selection or destruction may have dismissed this result while copying.
    if (this.imageData !== imageData) return;
    this.render(copied);
  }

  /** @param {boolean} copied - Whether the clipboard write actually succeeded. */
  render(copied) {
    const host = document.createElement('div');
    host.className = 'element-selector__capture-result';
    host.style.cssText = 'all:initial!important;position:fixed!important;' +
      'right:20px!important;bottom:20px!important;z-index:2147483647!important;';
    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      :host { color-scheme: light; }
      .capture-result { box-sizing: border-box; width: 340px;
        max-width: calc(100vw - 40px); padding: 16px; border-radius: 12px;
        border: 1px solid #d9dee7; background: #fff; color: #202735;
        box-shadow: 0 6px 28px #0003; font: 14px/1.5 system-ui, sans-serif; }
      p { margin: 0 0 12px; }
      .capture-result__actions { display: flex; gap: 8px; }
      button { font: inherit; cursor: pointer; border: 1px solid #d9dee7;
        border-radius: 6px; padding: 7px 12px; background: #fff; color: #202735; }
      .capture-result__edit { background: #2563eb; border-color: #2563eb; color: #fff; }
      button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
      button:disabled { opacity: .6; cursor: wait; }
    `;
    const panel = document.createElement('section');
    panel.className = 'capture-result';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = chrome.i18n.getMessage(copied ? 'captureCopied' : 'captureCopyFailed');
    const actions = document.createElement('div');
    actions.className = 'capture-result__actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'capture-result__edit';
    edit.textContent = chrome.i18n.getMessage('captureEdit');
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = chrome.i18n.getMessage('captureDismiss');
    edit.addEventListener('click', () => this.openEditor(edit, status));
    close.addEventListener('click', () => this.dismiss());
    actions.append(edit, close);
    panel.append(status, actions);
    root.append(style, panel);
    this.host = host;
    document.documentElement.appendChild(host);
    this.startDismissTimer();
    host.addEventListener('mouseenter', () => clearTimeout(this.timer));
    host.addEventListener('mouseleave', () => {
      if (!root.activeElement) this.startDismissTimer();
    });
    root.addEventListener('focusin', () => clearTimeout(this.timer));
    root.addEventListener('focusout', () => {
      if (!host.matches(':hover')) this.startDismissTimer();
    });
    root.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        this.dismiss();
      }
    });
  }

  /** Restarts the timeout after interaction ends. */
  startDismissTimer() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.dismiss(), CaptureResult.DISMISS_DELAY);
  }

  /** Opens the existing editor, retaining the image if the request fails. */
  async openEditor(button, status) {
    if (button.disabled || !this.imageData) return;
    clearTimeout(this.timer);
    button.disabled = true;
    const host = this.host;
    try {
      const response = await Messaging.sendToBackground({
        action: 'openEditor',
        imageData: this.imageData,
      });
      if (!response?.success) throw new Error(response?.error || 'Editor did not open');
      if (this.host === host) this.dismiss();
    } catch (error) {
      console.error('[CaptureResult] Failed to open editor:', error);
      if (this.host !== host) return;
      status.textContent = chrome.i18n.getMessage('captureEditorFailed');
      button.disabled = false;
      this.startDismissTimer();
    }
  }
}
