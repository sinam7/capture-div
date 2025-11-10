/**
 * Move Tool - Allows panning/moving the canvas view by dragging
 */

class MoveTool extends BaseTool {
  constructor(editor) {
    super(editor);
    this.canvasWrapper = editor.canvasWrapper;
    this.initialScrollLeft = 0;
    this.initialScrollTop = 0;
    this.isDragging = false;
  }

  /**
   * Updates cursor to move/grab cursor
   */
  updateCursor() {
    this.canvas.classList.remove('cursor-default', 'cursor-move', 'cursor-text', 'cursor-crosshair');
    this.canvas.classList.add('cursor-move');
  }

  /**
   * Called when dragging starts
   */
  onDrawStart(x, y) {
    this.isDragging = true;

    // Store initial scroll position
    this.initialScrollLeft = this.canvasWrapper.scrollLeft;
    this.initialScrollTop = this.canvasWrapper.scrollTop;

    // Store initial mouse position
    this.initialMouseX = this.startX;
    this.initialMouseY = this.startY;

    // Change cursor to grabbing
    this.canvas.style.cursor = 'grabbing';
  }

  /**
   * Called when mouse moves while dragging
   */
  onDrawMove(x, y) {
    if (!this.isDragging) return;

    // Calculate how much the mouse has moved in canvas coordinates
    const deltaX = x - this.initialMouseX;
    const deltaY = y - this.initialMouseY;

    // Apply zoom factor to the delta for proper scrolling at different zoom levels
    const zoom = this.editor.zoom || 1.0;

    // Update scroll position (negative because scrolling in opposite direction of drag)
    this.canvasWrapper.scrollLeft = this.initialScrollLeft - (deltaX * zoom);
    this.canvasWrapper.scrollTop = this.initialScrollTop - (deltaY * zoom);
  }

  /**
   * Called when dragging ends
   */
  onDrawEnd(x, y) {
    this.isDragging = false;

    // Reset cursor to grab (not grabbing)
    this.canvas.style.cursor = 'grab';
  }

  /**
   * Returns HTML for tool options
   */
  getOptionsHTML() {
    return `
      <div class="editor-options__content">
        <h3>Move Tool</h3>
        <p>Click and drag to pan the canvas.</p>
        <ul>
          <li>Drag to move the view</li>
          <li>Use with zoom for easier navigation</li>
          <li>Press ESC to deselect</li>
        </ul>
      </div>
    `;
  }
}
