/**
 * Base Tool - Abstract class for all editing tools
 */

class BaseTool {
  constructor(editor) {
    this.editor = editor;
    this.canvas = editor.canvas;
    this.canvasManager = editor.canvasManager;
    this.historyManager = editor.historyManager;
    this.isActive = false;
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
  }

  /**
   * Activates the tool
   */
  activate() {
    this.isActive = true;
    this.attachListeners();
    this.updateCursor();
    this.showOptions();
  }

  /**
   * Deactivates the tool
   */
  deactivate() {
    this.isActive = false;
    this.removeListeners();
    this.hideOptions();
  }

  /**
   * Attaches event listeners
   */
  attachListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * Removes event listeners
   */
  removeListeners() {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.removeDocumentListeners();
  }

  /**
   * Attaches document-level listeners for drawing outside canvas
   */
  attachDocumentListeners() {
    document.addEventListener('mousemove', this.handleDocumentMouseMove);
    document.addEventListener('mouseup', this.handleDocumentMouseUp);
  }

  /**
   * Removes document-level listeners
   */
  removeDocumentListeners() {
    document.removeEventListener('mousemove', this.handleDocumentMouseMove);
    document.removeEventListener('mouseup', this.handleDocumentMouseUp);
  }

  /**
   * Handles mouse down event
   * Override this in subclasses
   */
  handleMouseDown = (e) => {
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.isDrawing = true;

    // Attach document listeners to track mouse outside canvas
    this.attachDocumentListeners();

    this.onDrawStart(this.startX, this.startY);
  };

  /**
   * Handles mouse move event (on canvas)
   * Override this in subclasses
   */
  handleMouseMove = (e) => {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    this.currentX = e.clientX - rect.left;
    this.currentY = e.clientY - rect.top;

    this.onDrawMove(this.currentX, this.currentY);
  };

  /**
   * Handles mouse move event on document (when mouse leaves canvas)
   */
  handleDocumentMouseMove = (e) => {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    // Calculate position relative to canvas
    this.currentX = e.clientX - rect.left;
    this.currentY = e.clientY - rect.top;

    // Note: coordinates may be outside canvas bounds
    // Individual tools can clamp them in onDrawMove if needed
    this.onDrawMove(this.currentX, this.currentY);
  };

  /**
   * Handles mouse up event (on canvas)
   * Override this in subclasses
   */
  handleMouseUp = (e) => {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    this.currentX = e.clientX - rect.left;
    this.currentY = e.clientY - rect.top;
    this.isDrawing = false;

    // Remove document listeners
    this.removeDocumentListeners();

    this.onDrawEnd(this.currentX, this.currentY);
  };

  /**
   * Handles mouse up event on document (when mouse released outside canvas)
   */
  handleDocumentMouseUp = (e) => {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    this.currentX = e.clientX - rect.left;
    this.currentY = e.clientY - rect.top;
    this.isDrawing = false;

    // Remove document listeners
    this.removeDocumentListeners();

    this.onDrawEnd(this.currentX, this.currentY);
  };

  /**
   * Called when drawing starts
   * Override in subclasses
   */
  onDrawStart(x, y) {
    // To be implemented by subclasses
  }

  /**
   * Called when mouse moves while drawing
   * Override in subclasses
   */
  onDrawMove(x, y) {
    // To be implemented by subclasses
  }

  /**
   * Called when drawing ends
   * Override in subclasses
   */
  onDrawEnd(x, y) {
    // To be implemented by subclasses
  }

  /**
   * Called when drawing is cancelled
   * Override in subclasses
   */
  onDrawCancel() {
    // To be implemented by subclasses
  }

  /**
   * Updates cursor style
   */
  updateCursor() {
    this.canvas.classList.remove('cursor-default', 'cursor-move', 'cursor-text', 'cursor-crosshair');
    this.canvas.classList.add('cursor-crosshair');
  }

  /**
   * Shows tool options panel
   */
  showOptions() {
    const optionsPanel = document.getElementById('toolOptions');
    if (optionsPanel) {
      optionsPanel.innerHTML = this.getOptionsHTML();
      optionsPanel.classList.add('visible');
      this.attachOptionListeners();
    }
  }

  /**
   * Hides tool options panel
   */
  hideOptions() {
    const optionsPanel = document.getElementById('toolOptions');
    if (optionsPanel) {
      optionsPanel.classList.remove('visible');
    }
  }

  /**
   * Returns HTML for tool options
   * Override in subclasses
   */
  getOptionsHTML() {
    return '';
  }

  /**
   * Attaches listeners for option controls
   * Override in subclasses
   */
  attachOptionListeners() {
    // To be implemented by subclasses
  }

  /**
   * Gets current tool settings from UI
   */
  getSettings() {
    const colorPicker = document.getElementById('colorPicker');
    const strokeWidth = document.getElementById('strokeWidth');

    return {
      color: colorPicker ? colorPicker.value : '#ff0000',
      strokeWidth: strokeWidth ? parseInt(strokeWidth.value, 10) : 3,
    };
  }
}
