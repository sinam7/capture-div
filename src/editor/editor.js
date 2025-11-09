/**
 * Main Editor Controller
 */

class ImageEditor {
  constructor() {
    this.canvas = document.getElementById('editorCanvas');
    this.canvasManager = new CanvasManager(this.canvas);
    this.historyManager = new HistoryManager(this.canvasManager);

    this.tools = {
      crop: new CropTool(this),
      text: new TextTool(this),
      arrow: new ArrowTool(this),
      rectangle: new ShapeTool(this, 'rectangle'),
      circle: new ShapeTool(this, 'circle'),
      line: new ShapeTool(this, 'line'),
      blur: new BlurTool(this),
      mosaic: new MosaicTool(this),
    };

    this.currentTool = null;
    this.init();
  }

  /**
   * Initializes the editor
   */
  async init() {
    this.showLoading('Loading image...');

    try {
      // Load image from storage
      const imageData = await Storage.get('capturedImage');

      if (!imageData) {
        throw new Error('No image found in storage');
      }

      // Load image onto canvas
      await this.canvasManager.loadImage(imageData);

      // Initialize history with first state
      this.historyManager.init();

      // Set up UI
      this.setupToolbar();
      this.setupActions();
      this.setupKeyboardShortcuts();
      this.updateImageInfo();

      this.hideLoading();
      this.showNotification('Image loaded successfully!', 'success');
    } catch (error) {
      console.error('Failed to initialize editor:', error);
      this.hideLoading();
      this.showNotification('Failed to load image. ' + error.message, 'error');
    }
  }

  /**
   * Sets up toolbar event listeners
   */
  setupToolbar() {
    // Tool buttons
    const toolButtons = document.querySelectorAll('[data-tool]');
    toolButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const toolName = btn.dataset.tool;
        this.activateTool(toolName);
      });
    });

    // Action buttons
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    undoBtn?.addEventListener('click', () => this.undo());
    redoBtn?.addEventListener('click', () => this.redo());

    // Color and stroke width
    const strokeWidth = document.getElementById('strokeWidth');
    const strokeWidthValue = document.getElementById('strokeWidthValue');

    strokeWidth?.addEventListener('input', (e) => {
      strokeWidthValue.textContent = `${e.target.value}px`;
    });
  }

  /**
   * Sets up bottom action buttons
   */
  setupActions() {
    const resetBtn = document.getElementById('resetBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadPngBtn = document.getElementById('downloadPngBtn');
    const downloadJpgBtn = document.getElementById('downloadJpgBtn');

    resetBtn?.addEventListener('click', () => this.reset());
    copyBtn?.addEventListener('click', () => this.copyToClipboard());
    downloadPngBtn?.addEventListener('click', () => this.download('png'));
    downloadJpgBtn?.addEventListener('click', () => this.download('jpg'));
  }

  /**
   * Sets up keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Z - Undo
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        this.undo();
      }

      // Ctrl+Y - Redo
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        this.redo();
      }

      // ESC - Deselect tool
      if (e.key === 'Escape') {
        this.deactivateTool();
      }

      // Tool shortcuts
      const shortcuts = {
        v: 'select',
        c: 'crop',
        t: 'text',
        a: 'arrow',
        r: 'rectangle',
        o: 'circle',
        l: 'line',
        b: 'blur',
        m: 'mosaic',
      };

      if (!e.ctrlKey && !e.altKey && shortcuts[e.key.toLowerCase()]) {
        e.preventDefault();
        this.activateTool(shortcuts[e.key.toLowerCase()]);
      }
    });
  }

  /**
   * Activates a tool
   * @param {string} toolName - Name of the tool to activate
   */
  activateTool(toolName) {
    // Deactivate current tool
    this.deactivateTool();

    // Activate new tool
    if (this.tools[toolName]) {
      this.currentTool = this.tools[toolName];
      this.currentTool.activate();

      // Update button states
      this.updateToolButtons(toolName);
    }
  }

  /**
   * Deactivates the current tool
   */
  deactivateTool() {
    if (this.currentTool) {
      this.currentTool.deactivate();
      this.currentTool = null;
    }

    this.updateToolButtons(null);
  }

  /**
   * Updates toolbar button active states
   * @param {string|null} activeToolName - Name of active tool
   */
  updateToolButtons(activeToolName) {
    const toolButtons = document.querySelectorAll('[data-tool]');
    toolButtons.forEach((btn) => {
      if (btn.dataset.tool === activeToolName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Undoes the last action
   */
  undo() {
    if (this.historyManager.undo()) {
      this.showNotification('Undo successful');
    }
  }

  /**
   * Redoes the last undone action
   */
  redo() {
    if (this.historyManager.redo()) {
      this.showNotification('Redo successful');
    }
  }

  /**
   * Resets the canvas to original image
   */
  reset() {
    if (confirm('Reset all changes? This cannot be undone.')) {
      this.canvasManager.reset();
      this.historyManager.clear();
      this.historyManager.init();
      this.showNotification('Image reset to original');
    }
  }

  /**
   * Copies the current image to clipboard
   */
  async copyToClipboard() {
    try {
      const blob = await this.canvasManager.toBlob('png');

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);

      this.showNotification('Copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showNotification('Failed to copy to clipboard', 'error');
    }
  }

  /**
   * Downloads the image
   * @param {string} format - Image format (png/jpg)
   */
  download(format) {
    const dataUrl = this.canvasManager.toDataURL(format, 0.9);
    const filename = this.generateFilename(format);

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();

    this.showNotification(`Downloaded as ${filename}`, 'success');
  }

  /**
   * Generates a filename for download
   * @param {string} format - Image format
   * @returns {string} Generated filename
   */
  generateFilename(format) {
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `screenshot-${timestamp}.${format}`;
  }

  /**
   * Updates the image info display
   */
  updateImageInfo() {
    const imageInfo = document.getElementById('imageInfo');
    if (imageInfo) {
      const { width, height } = this.canvasManager.getDimensions();
      imageInfo.textContent = `${width} × ${height} px`;
    }
  }

  /**
   * Shows a notification message
   * @param {string} message - Message to show
   * @param {string} type - Notification type (success/error)
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `editor-notification editor-notification--${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Shows loading overlay
   * @param {string} message - Loading message
   */
  showLoading(message = 'Loading...') {
    const loading = document.createElement('div');
    loading.className = 'editor-loading';
    loading.id = 'editorLoading';
    loading.innerHTML = `
      <div class="editor-loading__spinner"></div>
      <div class="editor-loading__text">${message}</div>
    `;

    document.body.appendChild(loading);
  }

  /**
   * Hides loading overlay
   */
  hideLoading() {
    const loading = document.getElementById('editorLoading');
    if (loading) {
      loading.remove();
    }
  }
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.editor = new ImageEditor();
});
