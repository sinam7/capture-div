/**
 * Mosaic Tool - Applies mosaic/pixelation effect to selected areas
 * (To be implemented in Sprint 3)
 */

class MosaicTool extends BaseTool {
  constructor(editor) {
    super(editor);
    this.blockSize = 10;
    this.savedImageData = null;
  }

  onDrawStart(x, y) {
    console.log('[MosaicTool] Draw start at', x, y);
    this.savedImageData = this.canvasManager.getImageData();
  }

  onDrawMove(x, y) {
    // Clamp coordinates to canvas bounds (keep within valid pixel range)
    x = Math.max(0, Math.min(x, this.canvas.width - 1));
    y = Math.max(0, Math.min(y, this.canvas.height - 1));

    // Preview mosaic area (simplified for now)
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
    console.log('[MosaicTool] Draw end at', x, y);

    // Clamp coordinates to canvas bounds (keep within valid pixel range)
    x = Math.max(0, Math.min(x, this.canvas.width - 1));
    y = Math.max(0, Math.min(y, this.canvas.height - 1));

    // Calculate mosaic rectangle
    const width = x - this.startX;
    const height = y - this.startY;

    const rectX = Math.min(this.startX, x);
    const rectY = Math.min(this.startY, y);
    const rectWidth = Math.abs(width);
    const rectHeight = Math.abs(height);

    if (rectWidth > 5 && rectHeight > 5) {
      // IMPORTANT: Restore clean image first (removes selection rectangle)
      this.canvasManager.putImageData(this.savedImageData);

      // Then apply mosaic effect
      this.applyMosaic(rectX, rectY, rectWidth, rectHeight);

      // Save to history
      this.historyManager.saveState();
      console.log('[MosaicTool] Mosaic applied and saved to history');
    } else {
      // Selection too small, restore original
      this.canvasManager.putImageData(this.savedImageData);
      console.log('[MosaicTool] Selection too small, cancelled');
    }

    this.savedImageData = null;
  }

  onDrawCancel() {
    console.log('[MosaicTool] Draw cancelled');
    if (this.savedImageData) {
      this.canvasManager.putImageData(this.savedImageData);
    }
  }

  applyMosaic(x, y, width, height) {
    // Validate coordinates and dimensions
    if (width <= 0 || height <= 0) {
      console.warn('[MosaicTool] Invalid dimensions:', { width, height });
      return;
    }

    // Ensure coordinates are within canvas bounds
    x = Math.max(0, Math.min(Math.floor(x), this.canvas.width - 1));
    y = Math.max(0, Math.min(Math.floor(y), this.canvas.height - 1));
    width = Math.min(Math.floor(width), this.canvas.width - x);
    height = Math.min(Math.floor(height), this.canvas.height - y);

    console.log('[MosaicTool] Applying mosaic:', { x, y, width, height, blockSize: this.blockSize });

    const ctx = this.canvas.getContext('2d');
    const imageData = ctx.getImageData(x, y, width, height);
    const data = imageData.data;

    // Apply mosaic effect by averaging pixels in blocks
    for (let blockY = 0; blockY < height; blockY += this.blockSize) {
      for (let blockX = 0; blockX < width; blockX += this.blockSize) {
        // Calculate average color for this block
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;

        for (let py = 0; py < this.blockSize && blockY + py < height; py++) {
          for (let px = 0; px < this.blockSize && blockX + px < width; px++) {
            const i = ((blockY + py) * width + (blockX + px)) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            a += data[i + 3];
            count++;
          }
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        a = Math.floor(a / count);

        // Fill the block with average color
        for (let py = 0; py < this.blockSize && blockY + py < height; py++) {
          for (let px = 0; px < this.blockSize && blockX + px < width; px++) {
            const i = ((blockY + py) * width + (blockX + px)) * 4;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = a;
          }
        }
      }
    }

    ctx.putImageData(imageData, x, y);
  }

  getOptionsHTML() {
    const title = getMessage('editorOptionsMosaicTitle') || 'Mosaic Tool';
    const blockSizeLabel =
      getMessage('editorOptionsMosaicBlockSizeLabel') || 'Block Size';
    const instructions =
      getMessage('editorOptionsMosaicInstructions') ||
      'Click and drag to apply mosaic effect.';

    return `
      <h3>${title}</h3>
      <div class="editor-options__field">
        <label>${blockSizeLabel}: <span id="blockSizeValue">${this.blockSize}px</span></label>
        <input
          type="range"
          id="mosaicBlockSize"
          min="2"
          max="30"
          value="${this.blockSize}"
        />
      </div>
      <p style="font-size: 12px; color: #666; margin-top: 8px;">
        ${instructions}
      </p>
    `;
  }

  attachOptionListeners() {
    const blockSizeInput = document.getElementById('mosaicBlockSize');
    const blockSizeValue = document.getElementById('blockSizeValue');

    if (blockSizeInput) {
      blockSizeInput.addEventListener('input', (e) => {
        this.blockSize = parseInt(e.target.value, 10);
        if (blockSizeValue) {
          blockSizeValue.textContent = `${this.blockSize}px`;
        }
      });
    }
  }
}
