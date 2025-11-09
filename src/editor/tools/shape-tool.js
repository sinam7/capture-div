/**
 * Shape Tool - Draws shapes (rectangle, circle, line) on the image
 */

class ShapeTool extends BaseTool {
  constructor(editor, shapeType = 'rectangle') {
    super(editor);
    this.shapeType = shapeType; // 'rectangle', 'circle', 'line'
    this.filled = false;
    this.savedImageData = null;
  }

  setShapeType(type) {
    this.shapeType = type;
  }

  onDrawStart(x, y) {
    this.savedImageData = this.canvasManager.getImageData();
  }

  onDrawMove(x, y) {
    // Restore image and draw preview
    this.canvasManager.putImageData(this.savedImageData);
    this.drawShape(x, y);
  }

  onDrawEnd(x, y) {
    // Final shape is already drawn, just save state
    this.historyManager.saveState();
    this.savedImageData = null;
  }

  onDrawCancel() {
    if (this.savedImageData) {
      this.canvasManager.putImageData(this.savedImageData);
    }
  }

  drawShape(x, y) {
    const settings = this.getSettings();

    const options = {
      strokeStyle: settings.color,
      lineWidth: settings.strokeWidth,
      fillStyle: this.filled ? settings.color : null,
    };

    switch (this.shapeType) {
      case 'rectangle':
        this.drawRectangle(x, y, options);
        break;
      case 'circle':
        this.drawCircle(x, y, options);
        break;
      case 'line':
        this.drawLine(x, y, options);
        break;
    }
  }

  drawRectangle(x, y, options) {
    const width = x - this.startX;
    const height = y - this.startY;

    this.canvasManager.drawRect(
      Math.min(this.startX, x),
      Math.min(this.startY, y),
      Math.abs(width),
      Math.abs(height),
      options
    );
  }

  drawCircle(x, y, options) {
    const dx = x - this.startX;
    const dy = y - this.startY;
    const radius = Math.sqrt(dx * dx + dy * dy);

    this.canvasManager.drawCircle(this.startX, this.startY, radius, options);
  }

  drawLine(x, y, options) {
    this.canvasManager.drawLine(this.startX, this.startY, x, y, options);
  }

  getOptionsHTML() {
    const shapeName =
      this.shapeType.charAt(0).toUpperCase() + this.shapeType.slice(1);

    return `
      <h3>${shapeName} Tool</h3>
      <div class="editor-options__field">
        <label>
          <input type="checkbox" id="shapeFilled" ${this.filled ? 'checked' : ''} />
          Filled
        </label>
      </div>
      <p style="font-size: 12px; color: #666; margin-top: 8px;">
        Click and drag to draw a ${this.shapeType}.
      </p>
    `;
  }

  attachOptionListeners() {
    const filledCheckbox = document.getElementById('shapeFilled');

    if (filledCheckbox) {
      filledCheckbox.addEventListener('change', (e) => {
        this.filled = e.target.checked;
      });
    }
  }
}
