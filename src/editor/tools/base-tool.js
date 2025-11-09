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
   * Converts screen coordinates to canvas coordinates accounting for zoom
   * @param {number} screenX - X coordinate relative to canvas on screen
   * @param {number} screenY - Y coordinate relative to canvas on screen
   * @returns {Object} Canvas coordinates {x, y}
   */
  screenToCanvasCoords(screenX, screenY) {
    const zoom = this.editor.zoom || 1.0;

    // Get actual canvas dimensions
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // Get displayed canvas dimensions (affected by zoom)
    const displayedWidth = canvasWidth * zoom;
    const displayedHeight = canvasHeight * zoom;

    // Convert screen coordinates to canvas coordinates
    // Screen coords are relative to the zoomed (displayed) canvas
    // We need to convert to actual canvas pixel coordinates
    const canvasX = screenX / zoom;
    const canvasY = screenY / zoom;

    return { x: canvasX, y: canvasY };
  }

  /**
   * Handles mouse down event
   * Override this in subclasses
   */
  handleMouseDown = (e) => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert to canvas coordinates accounting for zoom
    const coords = this.screenToCanvasCoords(screenX, screenY);
    this.startX = coords.x;
    this.startY = coords.y;
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
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert to canvas coordinates accounting for zoom
    const coords = this.screenToCanvasCoords(screenX, screenY);
    this.currentX = coords.x;
    this.currentY = coords.y;

    this.onDrawMove(this.currentX, this.currentY);
  };

  /**
   * Handles mouse move event on document (when mouse leaves canvas)
   */
  handleDocumentMouseMove = (e) => {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert to canvas coordinates accounting for zoom
    const coords = this.screenToCanvasCoords(screenX, screenY);
    this.currentX = coords.x;
    this.currentY = coords.y;

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
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert to canvas coordinates accounting for zoom
    const coords = this.screenToCanvasCoords(screenX, screenY);
    this.currentX = coords.x;
    this.currentY = coords.y;
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
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert to canvas coordinates accounting for zoom
    const coords = this.screenToCanvasCoords(screenX, screenY);
    this.currentX = coords.x;
    this.currentY = coords.y;
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
