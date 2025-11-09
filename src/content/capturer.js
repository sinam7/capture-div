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
   * Hides all fixed/sticky positioned elements (floating UI)
   * Returns array of hidden elements for later restoration
   * @returns {Array} Array of {element, originalPosition, originalDisplay}
   */
  static hideFixedElements() {
    console.log('[ElementCapturer] Hiding fixed/sticky positioned elements');

    const hiddenElements = [];
    const allElements = document.querySelectorAll('*');

    allElements.forEach((element) => {
      const computedStyle = window.getComputedStyle(element);
      const position = computedStyle.position;

      // Check if element is fixed or sticky positioned
      if (position === 'fixed' || position === 'sticky') {
        // Skip if it's part of the target element we're capturing
        // (we'll handle this by checking ancestry later)

        // Store original values
        hiddenElements.push({
          element: element,
          originalPosition: element.style.position,
          originalDisplay: element.style.display,
          computedPosition: position,
        });

        // Hide the element
        element.style.display = 'none';

        console.log('[ElementCapturer] Hidden fixed/sticky element:', {
          tag: element.tagName,
          class: element.className,
          position: position,
        });
      }
    });

    console.log(`[ElementCapturer] Hidden ${hiddenElements.length} fixed/sticky elements`);
    return hiddenElements;
  }

  /**
   * Restores previously hidden fixed/sticky elements
   * @param {Array} hiddenElements - Array from hideFixedElements()
   */
  static restoreFixedElements(hiddenElements) {
    console.log(`[ElementCapturer] Restoring ${hiddenElements.length} fixed/sticky elements`);

    hiddenElements.forEach(({ element, originalPosition, originalDisplay }) => {
      // Restore original values
      if (originalPosition) {
        element.style.position = originalPosition;
      } else {
        element.style.position = '';
      }

      if (originalDisplay) {
        element.style.display = originalDisplay;
      } else {
        element.style.display = '';
      }
    });

    console.log('[ElementCapturer] Fixed/sticky elements restored');
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
   * Simple delay utility for rate limiting
   * @param {number} ms - Milliseconds to delay
   */
  static async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
   * Note: For elements larger than viewport, uses multi-scroll stitching
   * @param {HTMLElement} element - The element to capture
   * @returns {Promise<string>} Data URL of the captured image
   */
  static async captureWithNativeAPI(element) {
    console.log('[ElementCapturer] Capturing with Chrome native API');

    try {
      // Scroll to top of element
      await this.scrollElementIntoFullView(element);
      await this.waitForDOMUpdate();

      // Get initial element rect
      const initialRect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      console.log('[ElementCapturer] Element dimensions:', {
        left: initialRect.left,
        top: initialRect.top,
        width: initialRect.width,
        height: initialRect.height,
        viewportHeight,
      });

      // Check if element is taller than viewport
      const needsStitching = initialRect.height > viewportHeight * 0.9; // Use 90% to account for edges

      if (needsStitching) {
        console.log('[ElementCapturer] Element larger than viewport, using multi-scroll capture');
        return await this.captureWithStitching(element, initialRect);
      }

      // Single capture for elements that fit in viewport
      return await this.captureSingleViewport(element, initialRect);
    } catch (error) {
      console.error('[ElementCapturer] Native capture failed:', error);
      throw error;
    }
  }

  /**
   * Captures element that fits in single viewport
   * @param {HTMLElement} element - The element to capture
   * @param {DOMRect} rect - Element bounds
   * @returns {Promise<string>} Data URL of the captured image
   */
  static async captureSingleViewport(element, rect) {
    console.log('[ElementCapturer] Single viewport capture');

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Hide fixed/sticky elements for clean capture
    const hiddenFixedElements = this.hideFixedElements();
    await this.waitForDOMUpdate();

    try {
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

      // Crop to element bounds
      const result = await this.cropImage(response.imageData, rect, window.devicePixelRatio);

      // Restore fixed elements
      this.restoreFixedElements(hiddenFixedElements);

      return result;
    } catch (error) {
      // Restore fixed elements on error
      this.restoreFixedElements(hiddenFixedElements);
      throw error;
    }
  }

  /**
   * Captures tall element using multiple scrolls and stitches them together
   * @param {HTMLElement} element - The element to capture
   * @param {DOMRect} initialRect - Initial element bounds
   * @returns {Promise<string>} Data URL of the stitched image
   */
  static async captureWithStitching(element, initialRect) {
    console.log('[ElementCapturer] Starting multi-scroll capture and stitch');

    const dpr = window.devicePixelRatio;
    const viewportHeight = window.innerHeight;
    const elementHeight = initialRect.height;
    const elementWidth = initialRect.width;
    const elementLeft = initialRect.left;

    // Calculate number of captures needed (with 10% overlap to avoid gaps)
    const captureHeight = viewportHeight * 0.9;
    const numCaptures = Math.ceil(elementHeight / captureHeight);

    console.log('[ElementCapturer] Stitching params:', {
      elementHeight,
      viewportHeight,
      captureHeight,
      numCaptures,
    });

    // Store original scroll position
    const originalScrollY = window.scrollY;

    // Get element's absolute position
    const elementAbsoluteTop = initialRect.top + originalScrollY;

    // IMPORTANT: Hide all fixed/sticky elements to prevent floating UI duplication
    const hiddenFixedElements = this.hideFixedElements();

    // Wait for DOM to update after hiding elements
    await this.waitForDOMUpdate();

    // Create canvas for final stitched image
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = Math.round(elementWidth * dpr);
    finalCanvas.height = Math.round(elementHeight * dpr);
    const finalCtx = finalCanvas.getContext('2d');

    try {
      // Capture each section
      for (let i = 0; i < numCaptures; i++) {
        // IMPORTANT: Add delay between captures to respect Chrome's rate limit
        // Chrome limits captureVisibleTab to ~2 calls/second
        if (i > 0) {
          console.log(`[ElementCapturer] Waiting 550ms before next capture (rate limit)`);
          await this.delay(550); // 550ms delay = ~1.8 calls/sec (safely under 2/sec limit)
        }

        // Calculate scroll position for this capture
        const scrollOffset = i * captureHeight;
        const targetScrollY = elementAbsoluteTop + scrollOffset;

        // Scroll to position
        window.scrollTo({
          top: targetScrollY,
          behavior: 'instant',
        });

        await this.waitForDOMUpdate();

        // Get updated rect after scroll
        const currentRect = element.getBoundingClientRect();

        console.log(`[ElementCapturer] Capture ${i + 1}/${numCaptures} at scroll ${targetScrollY}`);

        // Notify progress (for UI updates)
        if (window.elementSelector) {
          window.elementSelector.updateCaptureProgress(i + 1, numCaptures);
        }

        // Capture visible viewport
        const response = await Messaging.sendToBackground({
          action: 'captureVisibleTab',
        });

        if (!response.success) {
          throw new Error(`Capture ${i + 1} failed: ${response.error}`);
        }

        // Load captured image
        const img = await this.loadImage(response.imageData);

        // Calculate which part of the element is visible in this capture
        const visibleTop = Math.max(0, currentRect.top);
        const visibleHeight = Math.min(currentRect.height, viewportHeight - visibleTop);

        // Calculate destination position in final canvas
        const destY = scrollOffset;

        // Draw this section onto final canvas
        finalCtx.drawImage(
          img,
          Math.round(currentRect.left * dpr), // source x
          Math.round(visibleTop * dpr), // source y
          Math.round(elementWidth * dpr), // source width
          Math.round(visibleHeight * dpr), // source height
          0, // dest x
          Math.round(destY * dpr), // dest y
          Math.round(elementWidth * dpr), // dest width
          Math.round(visibleHeight * dpr) // dest height
        );

        console.log(`[ElementCapturer] Section ${i + 1} stitched`);
      }

      // Restore original scroll position
      window.scrollTo({
        top: originalScrollY,
        behavior: 'instant',
      });

      await this.waitForDOMUpdate();

      // Restore fixed/sticky elements
      this.restoreFixedElements(hiddenFixedElements);

      console.log('[ElementCapturer] Stitching complete');
      return finalCanvas.toDataURL('image/png');
    } catch (error) {
      // Restore scroll and fixed elements on error
      window.scrollTo({
        top: originalScrollY,
        behavior: 'instant',
      });

      this.restoreFixedElements(hiddenFixedElements);

      throw error;
    }
  }

  /**
   * Loads image from data URL
   * @param {string} dataUrl - Image data URL
   * @returns {Promise<HTMLImageElement>}
   */
  static loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
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
