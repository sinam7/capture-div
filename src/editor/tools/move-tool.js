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
    const title = getMessage('editorOptionsMoveTitle') || 'Move Tool';
    const description =
      getMessage('editorOptionsMoveDescription') || 'Click and drag to pan the canvas.';
    const tips = [
      getMessage('editorOptionsMoveTip1') || 'Drag to move the view',
      getMessage('editorOptionsMoveTip2') || 'Use with zoom for easier navigation',
      getMessage('editorOptionsMoveTip3') || 'Press ESC to deselect',
    ];

    return `
      <div class="editor-options__content">
        <h3>${title}</h3>
        <p>${description}</p>
        <ul>
          <li>${tips[0]}</li>
          <li>${tips[1]}</li>
          <li>${tips[2]}</li>
        </ul>
      </div>
    `;
  }
}
