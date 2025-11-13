/**
 * Blur Tool - Applies blur effect to selected areas
 */

class BlurTool extends BaseTool {
  constructor(editor) {
    super(editor);
    this.blurRadius = 10;
    this.savedImageData = null;
  }

  onDrawStart(x, y) {
    console.log('[BlurTool] Draw start at', x, y);
    this.savedImageData = this.canvasManager.getImageData();
  }

  onDrawMove(x, y) {
    // Clamp coordinates to canvas bounds
    x = Math.max(0, Math.min(x, this.canvas.width));
    y = Math.max(0, Math.min(y, this.canvas.height));

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
    console.log('[BlurTool] Draw end at', x, y);

    // Clamp coordinates to canvas bounds
    x = Math.max(0, Math.min(x, this.canvas.width));
    y = Math.max(0, Math.min(y, this.canvas.height));

    // Calculate blur rectangle
    const width = x - this.startX;
    const height = y - this.startY;

    const rectX = Math.min(this.startX, x);
    const rectY = Math.min(this.startY, y);
    const rectWidth = Math.abs(width);
    const rectHeight = Math.abs(height);

    if (rectWidth > 5 && rectHeight > 5) {
      // IMPORTANT: Restore clean image first (removes selection rectangle)
      this.canvasManager.putImageData(this.savedImageData);

      // Then apply blur effect
      this.applySimpleBlur(rectX, rectY, rectWidth, rectHeight);

      // Save to history
      this.historyManager.saveState();
      console.log('[BlurTool] Blur applied and saved to history');
    } else {
      // Selection too small, restore original
      this.canvasManager.putImageData(this.savedImageData);
      console.log('[BlurTool] Selection too small, cancelled');
    }

    this.savedImageData = null;
  }

  onDrawCancel() {
    console.log('[BlurTool] Draw cancelled');
    if (this.savedImageData) {
      this.canvasManager.putImageData(this.savedImageData);
    }
  }

  applySimpleBlur(x, y, width, height) {
    console.log('[BlurTool] Applying blur to rect:', { x, y, width, height, radius: this.blurRadius });

    // Simple blur implementation using canvas filter (Chrome/Edge support)
    const ctx = this.canvas.getContext('2d');
    const imageData = ctx.getImageData(x, y, width, height);

    // Apply blur using canvas filter
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
    const title = getMessage('editorOptionsBlurTitle') || 'Blur Tool';
    const radiusLabel = getMessage('editorOptionsBlurRadiusLabel') || 'Blur Radius';
    const instructions =
      getMessage('editorOptionsBlurInstructions') || 'Click and drag to blur an area.';

    return `
      <h3>${title}</h3>
      <div class="editor-options__field">
        <label>${radiusLabel}: <span id="blurRadiusValue">${this.blurRadius}px</span></label>
        <input
          type="range"
          id="blurRadius"
          min="1"
          max="50"
          value="${this.blurRadius}"
        />
      </div>
      <p style="font-size: 12px; color: #666; margin-top: 8px;">
        ${instructions}
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
