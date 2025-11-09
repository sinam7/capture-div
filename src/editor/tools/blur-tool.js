/**
 * Blur Tool - Applies blur effect to selected areas
 * (To be implemented in Sprint 3)
 */

class BlurTool extends BaseTool {
  constructor(editor) {
    super(editor);
    this.blurRadius = 10;
    this.savedImageData = null;
  }

  onDrawStart(x, y) {
    this.savedImageData = this.canvasManager.getImageData();
  }

  onDrawMove(x, y) {
    // Preview blur area (simplified for now)
    this.canvasManager.putImageData(this.savedImageData);

    const settings = this.getSettings();
    const width = x - this.startX;
    const height = y - this.startY;

    // Draw selection rectangle as preview
    this.canvasManager.drawRect(
      Math.min(this.startX, x),
      Math.min(this.startY, y),
      Math.abs(width),
      Math.abs(height),
      {
        strokeStyle: settings.color,
        lineWidth: 2,
        lineDash: [5, 5],
      }
    );
  }

  onDrawEnd(x, y) {
    // Apply blur effect (to be fully implemented in Sprint 3)
    const width = x - this.startX;
    const height = y - this.startY;

    const rectX = Math.min(this.startX, x);
    const rectY = Math.min(this.startY, y);
    const rectWidth = Math.abs(width);
    const rectHeight = Math.abs(height);

    if (rectWidth > 5 && rectHeight > 5) {
      this.applySimpleBlur(rectX, rectY, rectWidth, rectHeight);
      this.historyManager.saveState();
    } else {
      this.canvasManager.putImageData(this.savedImageData);
    }

    this.savedImageData = null;
  }

  onDrawCancel() {
    if (this.savedImageData) {
      this.canvasManager.putImageData(this.savedImageData);
    }
  }

  applySimpleBlur(x, y, width, height) {
    // Simple blur implementation using canvas filter (Chrome/Edge support)
    const ctx = this.canvas.getContext('2d');
    const imageData = ctx.getImageData(x, y, width, height);

    // Apply blur using canvas (temporary simple implementation)
    ctx.save();
    ctx.filter = `blur(${this.blurRadius}px)`;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, x, y);
    ctx.restore();
  }

  getOptionsHTML() {
    return `
      <h3>Blur Tool</h3>
      <div class="editor-options__field">
        <label>Blur Radius: <span id="blurRadiusValue">${this.blurRadius}px</span></label>
        <input
          type="range"
          id="blurRadius"
          min="1"
          max="50"
          value="${this.blurRadius}"
        />
      </div>
      <p style="font-size: 12px; color: #666; margin-top: 8px;">
        Click and drag to blur an area.
      </p>
    `;
  }

  attachOptionListeners() {
    const blurRadiusInput = document.getElementById('blurRadius');
    const blurRadiusValue = document.getElementById('blurRadiusValue');

    if (blurRadiusInput) {
      blurRadiusInput.addEventListener('input', (e) => {
        this.blurRadius = parseInt(e.target.value, 10);
        if (blurRadiusValue) {
          blurRadiusValue.textContent = `${this.blurRadius}px`;
        }
      });
    }
  }
}
