/**
 * Element screenshot capturer
 * Handles capturing screenshots of selected elements
 */

class ElementCapturer {
  /**
   * Captures a screenshot of the specified element
   * @param {HTMLElement} element - The element to capture
   * @returns {Promise<string>} Data URL of the captured image
   */
  static async captureElement(element) {
    if (!element) {
      throw new Error('No element provided for capture');
    }

    try {
      // Get element position and dimensions
      const rect = element.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // Request full page screenshot from background
      const response = await Messaging.sendToBackground({
        action: 'captureVisibleTab',
        rect: {
          x: rect.left + scrollX,
          y: rect.top + scrollY,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top,
        },
        devicePixelRatio: window.devicePixelRatio,
        scrollX,
        scrollY,
      });

      if (!response.success) {
        throw new Error(response.error || 'Capture failed');
      }

      // Crop the image to element bounds
      const croppedImage = await this.cropImage(
        response.imageData,
        rect,
        window.devicePixelRatio
      );

      return croppedImage;
    } catch (error) {
      console.error('Error capturing element:', error);
      throw error;
    }
  }

  /**
   * Crops an image to the specified bounds
   * @param {string} imageData - Base64 encoded image data
   * @param {DOMRect} rect - The rectangle to crop to
   * @param {number} dpr - Device pixel ratio
   * @returns {Promise<string>} Cropped image data URL
   */
  static async cropImage(imageData, rect, dpr = 1) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Set canvas size to element size
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;

          // Scale context for device pixel ratio
          ctx.scale(dpr, dpr);

          // Draw the cropped portion
          ctx.drawImage(
            img,
            rect.left * dpr,
            rect.top * dpr,
            rect.width * dpr,
            rect.height * dpr,
            0,
            0,
            rect.width,
            rect.height
          );

          const croppedData = canvas.toDataURL('image/png');
          resolve(croppedData);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for cropping'));
      };

      img.src = imageData;
    });
  }

  /**
   * Captures using html2canvas if available
   * @param {HTMLElement} element - The element to capture
   * @returns {Promise<string>} Data URL of the captured image
   */
  static async captureWithHtml2Canvas(element) {
    if (typeof html2canvas === 'undefined') {
      throw new Error('html2canvas library not loaded');
    }

    const canvas = await html2canvas(element, {
      allowTaint: true,
      useCORS: true,
      scrollY: -window.scrollY,
      scrollX: -window.scrollX,
      backgroundColor: null,
      logging: false,
    });

    return canvas.toDataURL('image/png');
  }

  /**
   * Attempts to capture using the best available method
   * @param {HTMLElement} element - The element to capture
   * @returns {Promise<string>} Data URL of the captured image
   */
  static async capture(element) {
    // Try html2canvas first if available (better quality for complex elements)
    if (typeof html2canvas !== 'undefined') {
      try {
        return await this.captureWithHtml2Canvas(element);
      } catch (error) {
        console.warn('html2canvas capture failed, falling back to native capture:', error);
      }
    }

    // Fall back to native Chrome API
    return await this.captureElement(element);
  }
}
