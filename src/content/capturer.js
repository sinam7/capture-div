/**
 * Element screenshot capturer
 * Handles capturing screenshots of selected elements
 */

class ElementCapturer {
  /**
   * Captures a screenshot of the specified element
   * This is the main entry point - handles all capture scenarios
   * @param {HTMLElement} element - The element to capture
   * @returns {Promise<string>} Data URL of the captured image
   */
  static async capture(element) {
    console.log('[ElementCapturer] Starting capture for element:', element.tagName);

    if (!element) {
      throw new Error('No element provided for capture');
    }

    try {
      // Step 1: Remove all overlays and UI elements
      await this.hideAllOverlays();

      // Step 2: Ensure element is fully visible (handle elements outside viewport)
      await this.scrollElementIntoFullView(element);

      // Step 3: Wait for DOM to settle after hiding overlays
      await this.waitForDOMUpdate();

      // Step 4: Try html2canvas first (best for elements outside viewport)
      if (typeof html2canvas !== 'undefined') {
        console.log('[ElementCapturer] Using html2canvas method');
        return await this.captureWithHtml2Canvas(element);
      }

      // Step 5: Fall back to Chrome native API
      console.log('[ElementCapturer] Using Chrome native capture method');
      return await this.captureWithNativeAPI(element);
    } catch (error) {
      console.error('[ElementCapturer] Capture failed:', error);
      throw error;
    }
  }

  /**
   * Hides all overlay elements that might appear in the screenshot
   */
  static async hideAllOverlays() {
    console.log('[ElementCapturer] Hiding all overlays');

    // Hide element selector overlays
    const overlays = [
      '.element-selector__highlight',
      '.element-selector__tooltip',
      '.element-selector__slider',
      '.element-selector__instructions',
      '.element-selector__notification',
    ];

    overlays.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        el.style.display = 'none';
        console.log('[ElementCapturer] Hidden:', selector);
      });
    });

    // Also remove any inline styles that might have been added
    const highlights = document.querySelectorAll('.element-selector__highlight');
    highlights.forEach((el) => el.remove());
  }

  /**
   * Scrolls element into view ensuring it's fully visible
   * @param {HTMLElement} element - The element to scroll into view
   */
  static async scrollElementIntoFullView(element) {
    console.log('[ElementCapturer] Checking if element needs scrolling');

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Check if element is fully visible
    const isFullyVisible =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= viewportHeight &&
      rect.right <= viewportWidth;

    if (!isFullyVisible) {
      console.log('[ElementCapturer] Element not fully visible, scrolling into view');

      // Scroll element into view
      element.scrollIntoView({
        behavior: 'auto', // Instant scroll for capture
        block: 'start',
        inline: 'start',
      });

      // Wait for scroll to complete
      await this.waitForDOMUpdate();

      console.log('[ElementCapturer] Scroll completed');
    } else {
      console.log('[ElementCapturer] Element already fully visible');
    }
  }

  /**
   * Waits for DOM updates to complete
   * Ensures overlays are hidden and scroll is complete before capture
   */
  static async waitForDOMUpdate() {
    return new Promise((resolve) => {
      // Wait for next animation frame (ensures DOM is painted)
      requestAnimationFrame(() => {
        // Wait one more frame to be safe
        requestAnimationFrame(() => {
          // Add a small delay for good measure
          setTimeout(resolve, 100);
        });
      });
    });
  }

  /**
   * Captures using html2canvas (best method - handles elements outside viewport)
   * @param {HTMLElement} element - The element to capture
   * @returns {Promise<string>} Data URL of the captured image
   */
  static async captureWithHtml2Canvas(element) {
    console.log('[ElementCapturer] Capturing with html2canvas');

    if (typeof html2canvas === 'undefined') {
      throw new Error('html2canvas library not loaded');
    }

    try {
      const canvas = await html2canvas(element, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        // Important: Don't offset by scroll, html2canvas handles this
        scrollY: 0,
        scrollX: 0,
        // Capture the element at its current position
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        // Ignore certain elements
        ignoreElements: (el) => {
          // Ignore our UI overlays
          return (
            el.classList.contains('element-selector__highlight') ||
            el.classList.contains('element-selector__tooltip') ||
            el.classList.contains('element-selector__slider') ||
            el.classList.contains('element-selector__instructions') ||
            el.classList.contains('element-selector__notification')
          );
        },
      });

      const dataUrl = canvas.toDataURL('image/png');
      console.log('[ElementCapturer] html2canvas capture successful, size:', dataUrl.length);
      return dataUrl;
    } catch (error) {
      console.error('[ElementCapturer] html2canvas failed:', error);
      throw error;
    }
  }

  /**
   * Captures using Chrome's native tab capture API
   * Note: This only captures visible viewport, elements must be scrolled into view first
   * @param {HTMLElement} element - The element to capture
   * @returns {Promise<string>} Data URL of the captured image
   */
  static async captureWithNativeAPI(element) {
    console.log('[ElementCapturer] Capturing with Chrome native API');

    try {
      // Ensure element is in viewport
      await this.scrollElementIntoFullView(element);
      await this.waitForDOMUpdate();

      // Get element position relative to viewport
      const rect = element.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      console.log('[ElementCapturer] Element rect:', {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        scrollX,
        scrollY,
      });

      // Request visible tab screenshot from background
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

      console.log('[ElementCapturer] Tab captured, cropping to element bounds');

      // Crop the screenshot to element bounds
      const croppedImage = await this.cropImage(
        response.imageData,
        rect,
        window.devicePixelRatio
      );

      console.log('[ElementCapturer] Native capture successful');
      return croppedImage;
    } catch (error) {
      console.error('[ElementCapturer] Native capture failed:', error);
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
    console.log('[ElementCapturer] Cropping image to rect:', rect);

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate viewport dimensions from captured image
          const viewportWidth = img.width / dpr;
          const viewportHeight = img.height / dpr;

          console.log('[ElementCapturer] Viewport dimensions:', {
            viewportWidth,
            viewportHeight,
            imageWidth: img.width,
            imageHeight: img.height,
          });

          // Clamp crop area to what's actually visible in the captured viewport
          // The element rect is relative to viewport top-left (0, 0)
          const sourceX = Math.max(0, rect.left);
          const sourceY = Math.max(0, rect.top);
          const sourceWidth = Math.min(rect.width, viewportWidth - sourceX);
          const sourceHeight = Math.min(rect.height, viewportHeight - sourceY);

          // If element extends beyond viewport, warn user
          if (
            sourceWidth < rect.width ||
            sourceHeight < rect.height ||
            rect.left < 0 ||
            rect.top < 0
          ) {
            console.warn('[ElementCapturer] Element extends beyond viewport, cropping to visible area only', {
              requested: { width: rect.width, height: rect.height },
              actual: { width: sourceWidth, height: sourceHeight },
            });
          }

          // Set canvas size to actual crop size
          canvas.width = Math.round(sourceWidth * dpr);
          canvas.height = Math.round(sourceHeight * dpr);

          // Scale context for device pixel ratio
          ctx.scale(dpr, dpr);

          // Draw the cropped portion from the captured viewport image
          ctx.drawImage(
            img,
            Math.round(sourceX * dpr), // source x in captured image
            Math.round(sourceY * dpr), // source y in captured image
            Math.round(sourceWidth * dpr), // source width in captured image
            Math.round(sourceHeight * dpr), // source height in captured image
            0, // destination x
            0, // destination y
            sourceWidth, // destination width
            sourceHeight // destination height
          );

          const croppedData = canvas.toDataURL('image/png');
          console.log('[ElementCapturer] Image cropped successfully');
          resolve(croppedData);
        } catch (error) {
          console.error('[ElementCapturer] Crop failed:', error);
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
   * Restores all hidden overlays
   * Call this if capture fails and you need to restore UI
   */
  static async restoreOverlays() {
    console.log('[ElementCapturer] Restoring overlays');

    const overlays = [
      '.element-selector__highlight',
      '.element-selector__tooltip',
      '.element-selector__slider',
      '.element-selector__instructions',
      '.element-selector__notification',
    ];

    overlays.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        el.style.display = '';
      });
    });
  }
}
