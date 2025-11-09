/**
 * Canvas Manager - Handles canvas operations and drawing
 */

class CanvasManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.originalImage = null;
    this.currentImage = null;
    this.devicePixelRatio = window.devicePixelRatio || 1;
  }

  /**
   * Loads an image onto the canvas
   * @param {string} imageDataUrl - Base64 image data URL
   * @returns {Promise<void>}
   */
  async loadImage(imageDataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.originalImage = img;
        this.currentImage = img;

        // Set canvas size to image size
        this.canvas.width = img.width;
        this.canvas.height = img.height;

        // Set display size
        this.canvas.style.width = `${img.width}px`;
        this.canvas.style.height = `${img.height}px`;

        // Draw the image
        this.ctx.drawImage(img, 0, 0);

        resolve();
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = imageDataUrl;
    });
  }

  /**
   * Gets the current canvas as a data URL
   * @param {string} format - Image format (png/jpeg)
   * @param {number} quality - Image quality (0-1) for jpeg
   * @returns {string} Data URL
   */
  toDataURL(format = 'png', quality = 0.9) {
    const mimeType = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png';
    return this.canvas.toDataURL(mimeType, quality);
  }

  /**
   * Gets the current canvas as a Blob
   * @param {string} format - Image format (png/jpeg)
   * @param {number} quality - Image quality (0-1) for jpeg
   * @returns {Promise<Blob>}
   */
  async toBlob(format = 'png', quality = 0.9) {
    return new Promise((resolve) => {
      const mimeType = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png';
      this.canvas.toBlob(resolve, mimeType, quality);
    });
  }

  /**
   * Clears the entire canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Redraws the original image
   */
  reset() {
    if (this.originalImage) {
      this.clear();
      this.ctx.drawImage(this.originalImage, 0, 0);
    }
  }

  /**
   * Gets a copy of the current canvas state
   * @returns {ImageData}
   */
  getImageData() {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Puts image data onto the canvas
   * @param {ImageData} imageData - The image data to put
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  putImageData(imageData, x = 0, y = 0) {
    this.ctx.putImageData(imageData, x, y);
  }

  /**
   * Draws a rectangle
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @param {Object} options - Drawing options
   */
  drawRect(x, y, width, height, options = {}) {
    const {
      strokeStyle = '#ff0000',
      fillStyle = null,
      lineWidth = 2,
      lineDash = [],
    } = options;

    this.ctx.save();
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash(lineDash);

    if (fillStyle) {
      this.ctx.fillStyle = fillStyle;
      this.ctx.fillRect(x, y, width, height);
    }

    this.ctx.strokeRect(x, y, width, height);
    this.ctx.restore();
  }

  /**
   * Draws a circle
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @param {number} radius - Circle radius
   * @param {Object} options - Drawing options
   */
  drawCircle(cx, cy, radius, options = {}) {
    const {
      strokeStyle = '#ff0000',
      fillStyle = null,
      lineWidth = 2,
    } = options;

    this.ctx.save();
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineWidth = lineWidth;

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);

    if (fillStyle) {
      this.ctx.fillStyle = fillStyle;
      this.ctx.fill();
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Draws a line
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {Object} options - Drawing options
   */
  drawLine(x1, y1, x2, y2, options = {}) {
    const {
      strokeStyle = '#ff0000',
      lineWidth = 2,
      lineCap = 'round',
    } = options;

    this.ctx.save();
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = lineCap;

    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Draws an arrow
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {Object} options - Drawing options
   */
  drawArrow(x1, y1, x2, y2, options = {}) {
    const {
      strokeStyle = '#ff0000',
      lineWidth = 2,
      arrowSize = 15,
    } = options;

    // Draw the line
    this.drawLine(x1, y1, x2, y2, { strokeStyle, lineWidth });

    // Calculate arrow head
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headAngle = Math.PI / 6; // 30 degrees

    this.ctx.save();
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.fillStyle = strokeStyle;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Draw arrow head
    this.ctx.beginPath();
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(
      x2 - arrowSize * Math.cos(angle - headAngle),
      y2 - arrowSize * Math.sin(angle - headAngle)
    );
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(
      x2 - arrowSize * Math.cos(angle + headAngle),
      y2 - arrowSize * Math.sin(angle + headAngle)
    );
    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Draws text on the canvas
   * @param {string} text - Text to draw
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} options - Drawing options
   */
  drawText(text, x, y, options = {}) {
    const {
      font = '16px Arial',
      fillStyle = '#ff0000',
      strokeStyle = null,
      lineWidth = 1,
      textAlign = 'left',
      textBaseline = 'top',
    } = options;

    this.ctx.save();
    this.ctx.font = font;
    this.ctx.fillStyle = fillStyle;
    this.ctx.textAlign = textAlign;
    this.ctx.textBaseline = textBaseline;

    this.ctx.fillText(text, x, y);

    if (strokeStyle) {
      this.ctx.strokeStyle = strokeStyle;
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeText(text, x, y);
    }

    this.ctx.restore();
  }

  /**
   * Crops the canvas to specified bounds
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Crop width
   * @param {number} height - Crop height
   */
  crop(x, y, width, height) {
    // Get the cropped image data
    const imageData = this.ctx.getImageData(x, y, width, height);

    // Resize canvas
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Draw the cropped image
    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Gets canvas dimensions
   * @returns {Object} Width and height
   */
  getDimensions() {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }
}
