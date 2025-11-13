/**
 * Arrow Tool - Draws arrows on the image
 */

class ArrowTool extends BaseTool {
  constructor(editor) {
    super(editor);
    this.savedImageData = null;
  }

  onDrawStart(x, y) {
    this.savedImageData = this.canvasManager.getImageData();
  }

  onDrawMove(x, y) {
    // Restore image and draw preview
    this.canvasManager.putImageData(this.savedImageData);

    const settings = this.getSettings();

    this.canvasManager.drawArrow(this.startX, this.startY, x, y, {
      strokeStyle: settings.color,
      lineWidth: settings.strokeWidth,
    });
  }

  onDrawEnd(x, y) {
    // Final arrow is already drawn, just save state
    this.historyManager.saveState();
    this.savedImageData = null;
  }

  onDrawCancel() {
    if (this.savedImageData) {
      this.canvasManager.putImageData(this.savedImageData);
    }
  }

  getOptionsHTML() {
    const title = getMessage('editorOptionsArrowTitle') || 'Arrow Tool';
    const instructions =
      getMessage('editorOptionsArrowInstructions') || 'Click and drag to draw an arrow.';

    return `
      <h3>${title}</h3>
      <p style="font-size: 12px; color: #666;">
        ${instructions}
      </p>
    `;
  }
}
