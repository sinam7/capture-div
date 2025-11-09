/**
 * Crop Tool - Allows user to crop the image
 * Two modes:
 * 1. Drag to select area (original)
 * 2. Office-style edge handles to trim from borders
 */

class CropTool extends BaseTool {
  constructor(editor) {
    super(editor);
    this.cropRect = null;
    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d');

    // Edge crop mode (Office-style)
    this.edgeCropMode = false;
    this.edgeCropRect = null; // {top, left, right, bottom} - pixels to trim from each edge
    this.draggedHandle = null; // Which handle is being dragged
    this.handleSize = 10; // Size of corner/edge handles
  }

  activate() {
    super.activate();
    // Initialize edge crop mode when tool is activated
    this.edgeCropMode = true;
    this.edgeCropRect = { top: 0, left: 0, right: 0, bottom: 0 };
    this.savedImageData = this.canvasManager.getImageData();
    this.drawEdgeCropOverlay();
  }

  deactivate() {
    super.deactivate();
    // Clear the overlay by restoring clean image
    if (this.savedImageData) {
      this.canvasManager.putImageData(this.savedImageData);
    }
    this.edgeCropMode = false;
    this.edgeCropRect = null;
    this.draggedHandle = null;
  }

  onDrawStart(x, y) {
    console.log('[CropTool] Draw start at', x, y);

    if (this.edgeCropMode) {
      // Check if clicking on a handle
      this.draggedHandle = this.getHandleAtPosition(x, y);

      if (this.draggedHandle) {
        console.log('[CropTool] Dragging handle:', this.draggedHandle);
        this.savedImageData = this.canvasManager.getImageData();
        return;
      }
    }

    // If not dragging a handle, switch to area selection mode
    this.edgeCropMode = false;
    this.savedImageData = this.canvasManager.getImageData();
  }

  onDrawMove(x, y) {
    if (this.edgeCropMode && this.draggedHandle) {
      // Update edge crop based on handle drag
      this.updateEdgeCrop(x, y);
      this.drawEdgeCropOverlay();
      return;
    }

    // Original area selection mode
    x = Math.max(0, Math.min(x, this.canvas.width));
    y = Math.max(0, Math.min(y, this.canvas.height));

    const width = x - this.startX;
    const height = y - this.startY;

    this.cropRect = {
      x: Math.min(this.startX, x),
      y: Math.min(this.startY, y),
      width: Math.abs(width),
      height: Math.abs(height),
    };

    this.drawCropOverlay();
  }

  onDrawEnd(x, y) {
    console.log('[CropTool] Draw end at', x, y);

    if (this.edgeCropMode && this.draggedHandle) {
      // Apply edge crop
      this.draggedHandle = null;
      // Don't apply yet - let user adjust multiple edges
      return;
    }

    // Original area selection mode
    x = Math.max(0, Math.min(x, this.canvas.width));
    y = Math.max(0, Math.min(y, this.canvas.height));

    const width = x - this.startX;
    const height = y - this.startY;

    this.cropRect = {
      x: Math.min(this.startX, x),
      y: Math.min(this.startY, y),
      width: Math.abs(width),
      height: Math.abs(height),
    };

    if (!this.cropRect || this.cropRect.width < 10 || this.cropRect.height < 10) {
      // Selection too small, cancel and return to edge mode
      this.canvasManager.putImageData(this.savedImageData);
      this.edgeCropMode = true;
      this.drawEdgeCropOverlay();
      console.log('[CropTool] Selection too small, returning to edge mode');
      return;
    }

    // IMPORTANT: Restore clean image before applying crop (removes overlay)
    this.canvasManager.putImageData(this.savedImageData);

    // Apply the crop
    this.applyCrop();

    // Save to history and return to edge mode with new dimensions
    this.historyManager.saveState();
    this.edgeCropMode = true;
    this.edgeCropRect = { top: 0, left: 0, right: 0, bottom: 0 };
    this.savedImageData = this.canvasManager.getImageData();

    // Explicitly clear any overlay remnants by redrawing clean image
    this.canvasManager.putImageData(this.savedImageData);

    console.log('[CropTool] Crop applied and saved to history');
  }

  onDrawCancel() {
    if (this.savedImageData) {
      this.canvasManager.putImageData(this.savedImageData);
    }
    this.edgeCropMode = true;
    this.edgeCropRect = { top: 0, left: 0, right: 0, bottom: 0 };
    this.drawEdgeCropOverlay();
  }

  // Get which handle (if any) is at the given position
  getHandleAtPosition(x, y) {
    const rect = this.edgeCropRect;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const handleSize = this.handleSize;

    // Calculate actual crop area (what remains after trimming)
    const cropLeft = rect.left;
    const cropTop = rect.top;
    const cropRight = w - rect.right;
    const cropBottom = h - rect.bottom;

    // Check corner handles first (larger hit area)
    const cornerSize = handleSize * 1.5;

    // Top-left
    if (Math.abs(x - cropLeft) < cornerSize && Math.abs(y - cropTop) < cornerSize) {
      return 'top-left';
    }
    // Top-right
    if (Math.abs(x - cropRight) < cornerSize && Math.abs(y - cropTop) < cornerSize) {
      return 'top-right';
    }
    // Bottom-left
    if (Math.abs(x - cropLeft) < cornerSize && Math.abs(y - cropBottom) < cornerSize) {
      return 'bottom-left';
    }
    // Bottom-right
    if (Math.abs(x - cropRight) < cornerSize && Math.abs(y - cropBottom) < cornerSize) {
      return 'bottom-right';
    }

    // Check edge handles
    // Top edge
    if (Math.abs(y - cropTop) < handleSize && x > cropLeft + handleSize && x < cropRight - handleSize) {
      return 'top';
    }
    // Bottom edge
    if (Math.abs(y - cropBottom) < handleSize && x > cropLeft + handleSize && x < cropRight - handleSize) {
      return 'bottom';
    }
    // Left edge
    if (Math.abs(x - cropLeft) < handleSize && y > cropTop + handleSize && y < cropBottom - handleSize) {
      return 'left';
    }
    // Right edge
    if (Math.abs(x - cropRight) < handleSize && y > cropTop + handleSize && y < cropBottom - handleSize) {
      return 'right';
    }

    return null;
  }

  // Update edge crop rect based on handle drag
  updateEdgeCrop(x, y) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const rect = this.edgeCropRect;

    switch (this.draggedHandle) {
      case 'top':
        rect.top = Math.max(0, Math.min(y, h - rect.bottom - 10));
        break;
      case 'bottom':
        rect.bottom = Math.max(0, Math.min(h - y, h - rect.top - 10));
        break;
      case 'left':
        rect.left = Math.max(0, Math.min(x, w - rect.right - 10));
        break;
      case 'right':
        rect.right = Math.max(0, Math.min(w - x, w - rect.left - 10));
        break;
      case 'top-left':
        rect.top = Math.max(0, Math.min(y, h - rect.bottom - 10));
        rect.left = Math.max(0, Math.min(x, w - rect.right - 10));
        break;
      case 'top-right':
        rect.top = Math.max(0, Math.min(y, h - rect.bottom - 10));
        rect.right = Math.max(0, Math.min(w - x, w - rect.left - 10));
        break;
      case 'bottom-left':
        rect.bottom = Math.max(0, Math.min(h - y, h - rect.top - 10));
        rect.left = Math.max(0, Math.min(x, w - rect.right - 10));
        break;
      case 'bottom-right':
        rect.bottom = Math.max(0, Math.min(h - y, h - rect.top - 10));
        rect.right = Math.max(0, Math.min(w - x, w - rect.left - 10));
        break;
    }
  }

  // Draw edge crop overlay (Office-style)
  drawEdgeCropOverlay() {
    this.canvasManager.putImageData(this.savedImageData);

    const ctx = this.canvas.getContext('2d');
    const w = this.canvas.width;
    const h = this.canvas.height;
    const rect = this.edgeCropRect;

    ctx.save();

    // Draw darkened overlay on areas to be cropped
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

    // Top area
    if (rect.top > 0) {
      ctx.fillRect(0, 0, w, rect.top);
    }
    // Bottom area
    if (rect.bottom > 0) {
      ctx.fillRect(0, h - rect.bottom, w, rect.bottom);
    }
    // Left area
    if (rect.left > 0) {
      ctx.fillRect(0, rect.top, rect.left, h - rect.top - rect.bottom);
    }
    // Right area
    if (rect.right > 0) {
      ctx.fillRect(w - rect.right, rect.top, rect.right, h - rect.top - rect.bottom);
    }

    // Draw crop border
    const cropLeft = rect.left;
    const cropTop = rect.top;
    const cropWidth = w - rect.left - rect.right;
    const cropHeight = h - rect.top - rect.bottom;

    ctx.strokeStyle = '#4285f4';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropLeft, cropTop, cropWidth, cropHeight);

    // Draw handles
    this.drawHandles(ctx, cropLeft, cropTop, cropWidth, cropHeight);

    ctx.restore();
  }

  // Draw resize handles
  drawHandles(ctx, x, y, width, height) {
    const handleSize = this.handleSize;
    const handleColor = '#4285f4';
    const handleBorder = '#ffffff';

    ctx.fillStyle = handleColor;
    ctx.strokeStyle = handleBorder;
    ctx.lineWidth = 2;

    // Corner handles (larger)
    const corners = [
      { x: x, y: y }, // top-left
      { x: x + width, y: y }, // top-right
      { x: x, y: y + height }, // bottom-left
      { x: x + width, y: y + height }, // bottom-right
    ];

    corners.forEach(corner => {
      ctx.fillRect(corner.x - handleSize, corner.y - handleSize, handleSize * 2, handleSize * 2);
      ctx.strokeRect(corner.x - handleSize, corner.y - handleSize, handleSize * 2, handleSize * 2);
    });

    // Edge handles (smaller)
    const edges = [
      { x: x + width / 2, y: y }, // top
      { x: x + width / 2, y: y + height }, // bottom
      { x: x, y: y + height / 2 }, // left
      { x: x + width, y: y + height / 2 }, // right
    ];

    edges.forEach(edge => {
      ctx.fillRect(edge.x - handleSize / 2, edge.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(edge.x - handleSize / 2, edge.y - handleSize / 2, handleSize, handleSize);
    });
  }

  // Original crop overlay for area selection
  drawCropOverlay() {
    this.canvasManager.putImageData(this.savedImageData);

    const ctx = this.canvas.getContext('2d');

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
    if (this.cropRect) {
      // Area selection crop
      this.canvasManager.crop(
        this.cropRect.x,
        this.cropRect.y,
        this.cropRect.width,
        this.cropRect.height
      );
      this.cropRect = null;
    }
  }

  // Apply edge crop when user clicks "Apply" button
  applyEdgeCrop() {
    if (!this.edgeCropRect) return;

    const rect = this.edgeCropRect;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Check if there's anything to crop
    if (rect.top === 0 && rect.left === 0 && rect.right === 0 && rect.bottom === 0) {
      console.log('[CropTool] No edges to crop');
      return;
    }

    // Restore clean image
    this.canvasManager.putImageData(this.savedImageData);

    // Apply crop
    const cropX = rect.left;
    const cropY = rect.top;
    const cropWidth = w - rect.left - rect.right;
    const cropHeight = h - rect.top - rect.bottom;

    this.canvasManager.crop(cropX, cropY, cropWidth, cropHeight);

    // Save to history
    this.historyManager.saveState();

    // Reset edge crop state and ensure clean canvas
    this.edgeCropRect = { top: 0, left: 0, right: 0, bottom: 0 };
    this.savedImageData = this.canvasManager.getImageData();

    // Explicitly clear any overlay remnants by redrawing clean image
    this.canvasManager.putImageData(this.savedImageData);

    console.log('[CropTool] Edge crop applied');
  }

  getOptionsHTML() {
    return `
      <h3>Crop Tool</h3>
      <p style="font-size: 12px; color: #666; margin-bottom: 8px;">
        Two ways to crop:
      </p>
      <div class="editor-options__field">
        <label>Method 1: Edge Trim (Office-style)</label>
        <ul style="font-size: 11px; color: #666; padding-left: 16px; margin: 4px 0;">
          <li>Drag edge handles to trim borders</li>
          <li>Click Apply to confirm</li>
        </ul>
        <button id="applyEdgeCrop" style="width: 100%; margin-top: 8px; padding: 6px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Apply Edge Crop
        </button>
      </div>
      <div class="editor-options__field" style="margin-top: 12px;">
        <label>Method 2: Area Selection</label>
        <ul style="font-size: 11px; color: #666; padding-left: 16px; margin: 4px 0;">
          <li>Click and drag to select area</li>
          <li>Release to apply immediately</li>
        </ul>
      </div>
    `;
  }

  attachOptionListeners() {
    const applyBtn = document.getElementById('applyEdgeCrop');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.applyEdgeCrop());
    }
  }
}
