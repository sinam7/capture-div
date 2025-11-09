/**
 * Element screenshot capturer
 * Handles capturing screenshots of selected elements
 */

class ElementCapturer {
  /**
   * [NEW] Captures a screenshot of the specified element
   * This is the main entry point - always uses native API
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

      // Step 4: Always use the native API (html2canvas removed due to CSP conflicts)
      console.log('[ElementCapturer] Using Chrome native capture method');
      return await this.captureWithNativeAPI(element);

    } catch (error) {
      console.error('[ElementCapturer] Capture failed:', error);
      // Ensure overlays are restored on failure
      await this.restoreOverlays();
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
   * [NEW] Hides all fixed/sticky positioned elements on the page
   * Prevents them from appearing in screenshots or duplicating during stitching
   * @returns {Array} Array of {element, originalDisplay}
   */
  static hideAllFixedStickyElements() {
    console.log('[ElementCapturer] Hiding ALL fixed/sticky positioned elements');
    const hiddenElements = [];
    const allElements = document.querySelectorAll('*');

    allElements.forEach((el) => {
      // Skip our own UI elements
      if (el.className && typeof el.className === 'string' && el.className.startsWith('element-selector__')) {
        return;
      }

      const computedStyle = window.getComputedStyle(el);
      const position = computedStyle.position;

      if (position === 'fixed' || position === 'sticky') {
        hiddenElements.push({
          element: el,
          originalDisplay: el.style.display,
        });
        el.style.display = 'none';
      }
    });

    console.log(`[ElementCapturer] Hidden ${hiddenElements.length} fixed/sticky elements`);
    return hiddenElements;
  }

  /**
   * [NEW] Restores previously hidden fixed/sticky elements
   * @param {Array} hiddenElements - Array from hideAllFixedStickyElements()
   */
  static restoreFixedStickyElements(hiddenElements) {
    console.log(`[ElementCapturer] Restoring ${hiddenElements.length} elements`);
    hiddenElements.forEach(({ element, originalDisplay }) => {
      element.style.display = originalDisplay || '';
    });
  }

  /**
   * [NEW] Calculates the real content height ignoring CSS min-height
   * @param {HTMLElement} element - The element to measure
   * @returns {number} The true height of the content
   */
  static getRealContentHeight(element) {
    const rect = element.getBoundingClientRect();

    // 1. If no children, return own height
    if (!element.firstElementChild) {
      return rect.height;
    }

    // 2. Find the lowest bottom coordinate among all descendants
    const allDescendants = element.querySelectorAll('*');
    let lowestBottom = 0;

    // 3. Include element itself
    const selfRect = element.getBoundingClientRect();
    lowestBottom = selfRect.bottom;

    allDescendants.forEach(child => {
      const childRect = child.getBoundingClientRect();
      if (childRect.width > 0 || childRect.height > 0) {
        lowestBottom = Math.max(lowestBottom, childRect.bottom);
      }
    });

    // 4. Real height = (lowest bottom - element top)
    const realHeight = lowestBottom - rect.top;

    console.log('[ElementCapturer] Real content height calculated:', {
      computedHeight: rect.height, // CSS computed height (fake)
      scrollHeight: element.scrollHeight, // Scroll height (fake)
      realHeight: realHeight // Actual content height (real)
    });

    // 5. Return real height if valid
    if (realHeight > 0) {
      return realHeight;
    }

    // 6. Fallback to scrollHeight if calculation fails
    return element.scrollHeight;
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
   * [UPDATED] Captures using Chrome's native tab capture API
   * Uses getRealContentHeight to avoid CSS computed height issues
   * @param {HTMLElement} element - The element to capture
   * @returns {Promise<string>} Data URL of the captured image
   */
  static async captureWithNativeAPI(element) {
    console.log('[ElementCapturer] Capturing with Chrome native API');

    // [NEW] Calculate real content height first
    const contentHeight = this.getRealContentHeight(element);

    const initialRect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    console.log('[ElementCapturer] Element dimensions:', {
      left: initialRect.left,
      top: initialRect.top,
      width: initialRect.width,
      contentHeight: contentHeight,
      viewportHeight,
    });

    // [NEW] Use real content height to determine if stitching is needed
    const needsStitching = contentHeight > viewportHeight;

    // [NEW] Hide all sticky elements before capture
    const hiddenElements = this.hideAllFixedStickyElements();
    await this.waitForDOMUpdate();

    let imageDataUrl;
    try {
      if (needsStitching) {
        console.log('[ElementCapturer] Element larger than viewport, using multi-scroll capture');
        imageDataUrl = await this.captureWithStitching(element, initialRect, contentHeight, viewportHeight);
      } else {
        console.log('[ElementCapturer] Single viewport capture');
        imageDataUrl = await this.captureSingleViewport(element, initialRect, contentHeight);
      }
    } catch (error) {
      // Restore sticky elements on error
      this.restoreFixedStickyElements(hiddenElements);
      console.error('[ElementCapturer] Native capture failed:', error);
      throw error;
    }

    // [NEW] Restore all sticky elements after capture
    this.restoreFixedStickyElements(hiddenElements);

    return imageDataUrl;
  }

  /**
   * [UPDATED] Captures element that fits in single viewport
   * Uses real content height instead of CSS computed height
   * @param {HTMLElement} element - The element to capture
   * @param {DOMRect} rect - Element bounds
   * @param {number} contentHeight - The real content height
   * @returns {Promise<string>} Data URL of the captured image
   */
  static async captureSingleViewport(element, rect, contentHeight) {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const response = await Messaging.sendToBackground({
      action: 'captureVisibleTab',
      rect: {
        x: rect.left + scrollX,
        y: rect.top + scrollY,
        width: rect.width,
        height: contentHeight, // Use real content height instead of rect.height
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

    // Crop to element bounds using real content height
    return await this.cropImage(response.imageData, rect, window.devicePixelRatio, contentHeight);
  }

  /**
   * [UPDATED] Captures tall element using multiple scrolls and stitches them together
   * Uses real content height to avoid gray space from CSS min-height
   * @param {HTMLElement} element - The element to capture
   * @param {DOMRect} initialRect - Initial element bounds
   * @param {number} contentHeight - The real content height
   * @param {number} viewportHeight - window.innerHeight
   * @returns {Promise<string>} Data URL of the stitched image
   */
  static async captureWithStitching(element, initialRect, contentHeight, viewportHeight) {
    const dpr = window.devicePixelRatio;
    const originalScrollY = window.scrollY;

    try {
      // 1. Scroll to top of element
      window.scrollTo({
        top: initialRect.top + originalScrollY,
        behavior: 'instant',
      });
      await this.waitForDOMUpdate();

      const elementWidth = initialRect.width;
      const elementAbsoluteTop = initialRect.top + window.scrollY;

      // 2. Calculate number of captures needed
      const numCaptures = Math.ceil(contentHeight / viewportHeight);
      console.log(`[ElementCapturer] Stitching params: contentHeight=${contentHeight}, viewportHeight=${viewportHeight}, numCaptures=${numCaptures}`);

      // 3. Create final canvas with real content height
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = Math.round(elementWidth * dpr);
      finalCanvas.height = Math.round(contentHeight * dpr);
      const finalCtx = finalCanvas.getContext('2d');

      let capturedHeight = 0;

      // 4. Capture loop
      for (let i = 0; i < numCaptures; i++) {
        const scrollY = elementAbsoluteTop + (i * viewportHeight);
        window.scrollTo({ top: scrollY, behavior: 'instant' });
        await this.waitForDOMUpdate();

        console.log(`[ElementCapturer] Capture ${i + 1}/${numCaptures}`);

        // Update progress indicator
        if (window.elementSelector) {
          window.elementSelector.updateCaptureProgress(i + 1, numCaptures);
        }

        // Capture viewport
        const response = await Messaging.sendToBackground({ action: 'captureVisibleTab' });
        if (!response.success) throw new Error(`Capture ${i + 1} failed: ${response.error}`);

        const img = await this.loadImage(response.imageData);
        const currentRect = element.getBoundingClientRect();

        // 5. Calculate source and destination regions
        const sourceY = (i === 0) ? currentRect.top : 0;
        const remainingHeight = contentHeight - capturedHeight;
        const sourceHeight = Math.min(viewportHeight, remainingHeight);
        const destY = capturedHeight;

        // 6. Draw to canvas
        finalCtx.drawImage(
          img,
          Math.round(currentRect.left * dpr), // source x
          Math.round(sourceY * dpr),        // source y
          Math.round(elementWidth * dpr),     // source width
          Math.round(sourceHeight * dpr),   // source height
          0,                                // dest x
          Math.round(destY * dpr),          // dest y
          Math.round(elementWidth * dpr),     // dest width
          Math.round(sourceHeight * dpr)    // dest height
        );

        capturedHeight += sourceHeight;

        // Rate limiting
        await this.delay(100);
      }

      // Restore original scroll position
      window.scrollTo({ top: originalScrollY, behavior: 'instant' });
      await this.waitForDOMUpdate();

      console.log('[ElementCapturer] Stitching complete');
      return finalCanvas.toDataURL('image/png');

    } catch (error) {
      // Restore scroll on error
      window.scrollTo({ top: originalScrollY, behavior: 'instant' });
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
   * [UPDATED] Crops an image to the specified bounds
   * Uses contentHeight parameter for real content height
   * @param {string} imageData - Base64 encoded image data
   * @param {DOMRect} rect - The rectangle to crop to
   * @param {number} dpr - Device pixel ratio
   * @param {number} contentHeight - The real content height to use for cropping
   * @returns {Promise<string>} Cropped image data URL
   */
  static async cropImage(imageData, rect, dpr = 1, contentHeight) {
    console.log('[ElementCapturer] Cropping image to rect:', rect, 'with contentHeight:', contentHeight);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const sourceX = rect.left;
          const sourceY = rect.top;
          const sourceWidth = rect.width;
          const sourceHeight = contentHeight; // Use real content height instead of rect.height

          canvas.width = Math.round(sourceWidth * dpr);
          canvas.height = Math.round(sourceHeight * dpr);

          // Draw with device pixel ratio
          ctx.drawImage(
            img,
            Math.round(sourceX * dpr),
            Math.round(sourceY * dpr),
            Math.round(sourceWidth * dpr),
            Math.round(sourceHeight * dpr),
            0,
            0,
            Math.round(sourceWidth * dpr),
            Math.round(sourceHeight * dpr)
          );

          const croppedData = canvas.toDataURL('image/png');
          console.log('[ElementCapturer] Image cropped successfully');
          resolve(croppedData);
        } catch (error) {
          console.error('[ElementCapturer] Crop failed:', error);
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for cropping'));
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
