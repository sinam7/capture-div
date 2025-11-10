/**
 * Move Tool - Allows panning/moving the canvas view by dragging
 */

class MoveTool extends BaseTool {
  constructor(editor) {
    super(editor);
    this.canvasWrapper = editor.canvasWrapper;
    this.isDragging = false;
    this.lastClientX = 0;
    this.lastClientY = 0;
  }

  /**
   * Updates cursor to move/grab cursor
   */
  updateCursor() {
    this.canvas.classList.remove('cursor-default', 'cursor-move', 'cursor-text', 'cursor-crosshair');
    this.canvas.style.cursor = 'grab';
  }

  /**
   * Deactivates the tool and resets cursor
   */
  deactivate() {
    super.deactivate();
    // Reset cursor to default defined in CSS
    this.canvas.style.cursor = '';
  }

  /**
   * Override handleMouseDown to use screen coordinates directly
   */
  handleMouseDown = (e) => {
    this.isDragging = true;
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;

    // Change cursor to grabbing
    this.canvas.style.cursor = 'grabbing';

    // Attach document listeners to track mouse outside canvas
    this.attachDocumentListeners();
  };

  /**
   * Override handleMouseMove to use screen coordinates directly
   */
  handleMouseMove = (e) => {
    if (!this.isDragging) return;

    // Calculate the delta from the last position
    const deltaX = e.clientX - this.lastClientX;
    const deltaY = e.clientY - this.lastClientY;

    // Update translate position
    this.editor.translateX += deltaX;
    this.editor.translateY += deltaY;

    // Update last position
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;

    // Apply transform
    this.editor.updateCanvasTransform();
  };

  /**
   * Override handleDocumentMouseMove to use screen coordinates directly
   */
  handleDocumentMouseMove = this.handleMouseMove;

  /**
   * Override handleMouseUp
   */
  handleMouseUp = (e) => {
    if (!this.isDragging) return;

    this.isDragging = false;

    // Reset cursor to grab (not grabbing)
    this.canvas.style.cursor = 'grab';

    // Remove document listeners
    this.removeDocumentListeners();
  };

  /**
   * Override handleDocumentMouseUp
   */
  handleDocumentMouseUp = this.handleMouseUp;

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
