/**
 * Crop Tool - Allows user to crop the image
 */

class CropTool extends BaseTool {
  constructor(editor) {
    super(editor);
    this.cropRect = null;
    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d');
  }

  onDrawStart(x, y) {
    console.log('[CropTool] Draw start at', x, y);
    // Save the current canvas state
    this.savedImageData = this.canvasManager.getImageData();
  }

  onDrawMove(x, y) {
    // Clamp coordinates to canvas bounds (prevent crop selection outside canvas)
    x = Math.max(0, Math.min(x, this.canvas.width));
    y = Math.max(0, Math.min(y, this.canvas.height));

    // Calculate crop rectangle
    const width = x - this.startX;
    const height = y - this.startY;

    this.cropRect = {
      x: Math.min(this.startX, x),
      y: Math.min(this.startY, y),
      width: Math.abs(width),
      height: Math.abs(height),
    };

    // Redraw with selection overlay
    this.drawCropOverlay();
  }

  onDrawEnd(x, y) {
    console.log('[CropTool] Draw end at', x, y);

    // Clamp coordinates to canvas bounds
    x = Math.max(0, Math.min(x, this.canvas.width));
    y = Math.max(0, Math.min(y, this.canvas.height));

    // Recalculate crop rectangle with clamped coordinates
    const width = x - this.startX;
    const height = y - this.startY;

    this.cropRect = {
      x: Math.min(this.startX, x),
      y: Math.min(this.startY, y),
      width: Math.abs(width),
      height: Math.abs(height),
    };

    if (!this.cropRect || this.cropRect.width < 10 || this.cropRect.height < 10) {
      // Selection too small, cancel
      this.canvasManager.putImageData(this.savedImageData);
      console.log('[CropTool] Selection too small, cancelled');
      return;
    }

    // IMPORTANT: Restore clean image before applying crop (removes overlay)
    this.canvasManager.putImageData(this.savedImageData);

    // Apply the crop
    this.applyCrop();

    // Save to history
    this.historyManager.saveState();
    console.log('[CropTool] Crop applied and saved to history');
  }

  onDrawCancel() {
    if (this.savedImageData) {
      this.canvasManager.putImageData(this.savedImageData);
    }
  }

  drawCropOverlay() {
    // Restore original image
    this.canvasManager.putImageData(this.savedImageData);

    const ctx = this.canvas.getContext('2d');

    // Draw semi-transparent overlay over non-selected areas
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

    // Top
    ctx.fillRect(0, 0, this.canvas.width, this.cropRect.y);

    // Bottom
    ctx.fillRect(
      0,
      this.cropRect.y + this.cropRect.height,
      this.canvas.width,
      this.canvas.height - (this.cropRect.y + this.cropRect.height)
    );

    // Left
    ctx.fillRect(0, this.cropRect.y, this.cropRect.x, this.cropRect.height);

    // Right
    ctx.fillRect(
      this.cropRect.x + this.cropRect.width,
      this.cropRect.y,
      this.canvas.width - (this.cropRect.x + this.cropRect.width),
      this.cropRect.height
    );

    // Draw selection border
    ctx.strokeStyle = '#4285f4';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(this.cropRect.x, this.cropRect.y, this.cropRect.width, this.cropRect.height);

    ctx.restore();
  }

  applyCrop() {
    // Crop the canvas
    this.canvasManager.crop(
      this.cropRect.x,
      this.cropRect.y,
      this.cropRect.width,
      this.cropRect.height
    );

    this.cropRect = null;
    this.savedImageData = null;
  }

  getOptionsHTML() {
    return `
      <h3>Crop Tool</h3>
      <p style="font-size: 12px; color: #666; margin-bottom: 8px;">
        Click and drag to select the area to crop.
      </p>
      <div class="editor-options__field">
        <label>Instructions:</label>
        <ul style="font-size: 11px; color: #666; padding-left: 16px; margin: 4px 0;">
          <li>Click and drag to select area</li>
          <li>Release to apply crop</li>
          <li>Use Undo if needed</li>
        </ul>
      </div>
    `;
  }
}
