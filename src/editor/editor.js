/**
 * Main Editor Controller
 */

class ImageEditor {
  constructor() {
    this.canvas = document.getElementById('editorCanvas');
    this.canvasWrapper = document.getElementById('canvasWrapper');
    this.canvasManager = new CanvasManager(this.canvas);
    this.historyManager = new HistoryManager(this.canvasManager);

    this.tools = {
      move: new MoveTool(this),
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

    // Zoom properties
    this.zoom = 1.0; // 100%
    this.minZoom = 0.1; // 10%
    this.maxZoom = 5.0; // 500%
    this.zoomStep = 0.1; // 10% per step

    // Pan/translate properties
    this.translateX = 0;
    this.translateY = 0;

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
      this.setupZoom();
      this.setupKeyboardShortcuts();
      this.updateImageInfo();

      // Auto-fit large images to screen
      this.fitToScreen();

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
   * Sets up zoom controls
   */
  setupZoom() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const fitScreenBtn = document.getElementById('fitScreenBtn');
    const actualSizeBtn = document.getElementById('actualSizeBtn');

    zoomInBtn?.addEventListener('click', () => this.zoomIn());
    zoomOutBtn?.addEventListener('click', () => this.zoomOut());
    fitScreenBtn?.addEventListener('click', () => this.fitToScreen());
    actualSizeBtn?.addEventListener('click', () => this.setZoom(1.0));

    // Mouse wheel zoom
    this.canvasWrapper.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          this.zoomIn();
        } else {
          this.zoomOut();
        }
      }
    });
  }

  /**
   * Zooms in
   */
  zoomIn() {
    this.setZoom(Math.min(this.zoom + this.zoomStep, this.maxZoom));
  }

  /**
   * Zooms out
   */
  zoomOut() {
    this.setZoom(Math.max(this.zoom - this.zoomStep, this.minZoom));
  }

  /**
   * Fits canvas to screen
   */
  fitToScreen() {
    const { width, height } = this.canvasManager.getDimensions();
    const wrapperRect = this.canvasWrapper.getBoundingClientRect();

    // Calculate available space (subtract padding)
    const availableWidth = wrapperRect.width - 40; // 20px padding on each side
    const availableHeight = wrapperRect.height - 40;

    // Calculate zoom to fit
    const zoomX = availableWidth / width;
    const zoomY = availableHeight / height;
    const fitZoom = Math.min(zoomX, zoomY, 1.0); // Don't zoom beyond 100% for fit

    this.setZoom(fitZoom);
  }

  /**
   * Sets zoom level
   * @param {number} newZoom - New zoom level
   */
  setZoom(newZoom) {
    this.zoom = Math.max(this.minZoom, Math.min(newZoom, this.maxZoom));

    // Apply transform to canvas (preserve translate if it exists)
    const translateX = this.translateX || 0;
    const translateY = this.translateY || 0;
    this.canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${this.zoom})`;

    // Adjust canvas wrapper to enable proper scrolling
    // The canvas takes up space based on its actual size, but visually scales
    // We need to ensure the wrapper can scroll when canvas is larger than viewport
    const { width, height } = this.canvasManager.getDimensions();

    // Set min-width/min-height on wrapper to enable scrolling for large canvases
    // This ensures scroll bars appear when scaled canvas exceeds viewport
    this.canvasWrapper.style.minWidth = 'auto';
    this.canvasWrapper.style.minHeight = 'auto';

    // Update zoom level display
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel) {
      zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
    }

    console.log('[Editor] Zoom set to:', this.zoom);
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

      // Zoom shortcuts
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        this.zoomIn();
      }

      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        this.zoomOut();
      }

      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        this.fitToScreen();
      }

      if (e.key === '0' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        this.setZoom(1.0);
      }

      // Tool shortcuts
      const shortcuts = {
        v: 'move',
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
