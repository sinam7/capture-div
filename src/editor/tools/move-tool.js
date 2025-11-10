/**
 * Move Tool - Allows panning/moving the canvas view by dragging
 */

class MoveTool extends BaseTool {
  constructor(editor) {
    super(editor);
    this.canvasWrapper = editor.canvasWrapper;
    this.isDragging = false;

    // Initialize translate position if not exists
    if (!this.editor.translateX) {
      this.editor.translateX = 0;
      this.editor.translateY = 0;
    }
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

    // Store initial translate position
    this.initialTranslateX = this.editor.translateX || 0;
    this.initialTranslateY = this.editor.translateY || 0;

    // Store initial mouse position in screen coordinates (not canvas coordinates)
    const rect = this.canvas.getBoundingClientRect();
    this.initialScreenX = this.startX * (this.editor.zoom || 1.0);
    this.initialScreenY = this.startY * (this.editor.zoom || 1.0);

    // Change cursor to grabbing
    this.canvas.style.cursor = 'grabbing';
  }

  /**
   * Called when mouse moves while dragging
   */
  onDrawMove(x, y) {
    if (!this.isDragging) return;

    // Calculate how much the mouse has moved in screen coordinates
    const zoom = this.editor.zoom || 1.0;
    const currentScreenX = x * zoom;
    const currentScreenY = y * zoom;

    const deltaX = currentScreenX - this.initialScreenX;
    const deltaY = currentScreenY - this.initialScreenY;

    // Update translate position
    this.editor.translateX = this.initialTranslateX + deltaX;
    this.editor.translateY = this.initialTranslateY + deltaY;

    // Apply both scale and translate transforms
    this.updateCanvasTransform();
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
   * Updates the canvas transform with both scale and translate
   */
  updateCanvasTransform() {
    const zoom = this.editor.zoom || 1.0;
    const translateX = this.editor.translateX || 0;
    const translateY = this.editor.translateY || 0;

    this.canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoom})`;
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
