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
   * Hides all fixed/sticky positioned elements (floating UI) except those inside target
   * Returns array of hidden elements for later restoration
   * @param {HTMLElement} targetElement - The element being captured (to exclude its descendants)
   * @returns {Array} Array of {element, originalPosition, originalDisplay}
   */
  static hideFixedElements(targetElement) {
    console.log('[ElementCapturer] Hiding fixed/sticky positioned elements');

    const hiddenElements = [];
    const allElements = document.querySelectorAll('*');

    allElements.forEach((element) => {
      const computedStyle = window.getComputedStyle(element);
      const position = computedStyle.position;

      // Check if element is fixed or sticky positioned
      if (position === 'fixed' || position === 'sticky') {
        // IMPORTANT: Skip if it's part of the target element we're capturing
        // We only want to hide floating UI elements, not fixed content inside the target
        if (targetElement && targetElement.contains(element)) {
          console.log('[ElementCapturer] Skipping fixed/sticky element inside target:', {
            tag: element.tagName,
            class: element.className,
          });
          return; // Skip this element
        }

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
   * Hides fixed/sticky positioned elements INSIDE target element
   * Called after first capture to prevent duplication in subsequent captures
   * @param {HTMLElement} targetElement - The element being captured
   * @returns {Object} {elements: Array, totalHeight: number}
   */
  static hideFixedElementsInsideTarget(targetElement) {
    console.log('[ElementCapturer] Hiding fixed/sticky elements inside target');

    const hiddenElements = [];
    let totalHeight = 0;
    const allElements = targetElement.querySelectorAll('*');

    allElements.forEach((element) => {
      const computedStyle = window.getComputedStyle(element);
      const position = computedStyle.position;

      // Check if element is fixed or sticky positioned
      if (position === 'fixed' || position === 'sticky') {
        // Get element height before hiding
        const rect = element.getBoundingClientRect();
        const elementHeight = rect.height;

        // Store original values
        hiddenElements.push({
          element: element,
          originalPosition: element.style.position,
          originalDisplay: element.style.display,
          computedPosition: position,
          height: elementHeight,
        });

        totalHeight += elementHeight;

        // Hide the element
        element.style.display = 'none';

        console.log('[ElementCapturer] Hidden internal fixed/sticky element:', {
          tag: element.tagName,
          class: element.className,
          position: position,
          height: elementHeight,
        });
      }
    });

    console.log(`[ElementCapturer] Hidden ${hiddenElements.length} internal fixed/sticky elements, total height: ${totalHeight}px`);
    return { elements: hiddenElements, totalHeight };
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
        // Let html2canvas calculate actual content size automatically (without CSS computed height)
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

    // Hide fixed/sticky elements for clean capture (except those inside target)
    const hiddenFixedElements = this.hideFixedElements(element);
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
   * Uses industry-standard approach: scroll to element top, capture viewport-sized chunks,
   * position based on absolute scroll offsets (similar to Chrome DevTools)
   * @param {HTMLElement} element - The element to capture
   * @param {DOMRect} initialRect - Initial element bounds
   * @returns {Promise<string>} Data URL of the stitched image
   */
  static async captureWithStitching(element, initialRect) {
    console.log('[ElementCapturer] Starting multi-scroll capture and stitch');

    const dpr = window.devicePixelRatio;
    const viewportHeight = window.innerHeight;

    // Store original scroll position for restoration
    const originalScrollY = window.scrollY;

    // IMPORTANT: Hide all fixed/sticky elements OUTSIDE target to prevent floating UI duplication
    const hiddenExternalFixedElements = this.hideFixedElements(element);

    // Wait for DOM to update and ensure hiding takes visual effect
    await this.waitForDOMUpdate();
    await this.delay(100);

    // Track fixed elements inside target (hidden after first capture)
    let hiddenInternalFixedElements = []; // Array format to match external fixed elements

    try {
      // STEP 1: Scroll to element's top to establish predictable starting point
      window.scrollTo({
        top: initialRect.top + originalScrollY,
        behavior: 'instant',
      });
      await this.waitForDOMUpdate();

      console.log('[ElementCapturer] Scrolled to element top');

      // STEP 2: Capture first section with sticky elements visible
      console.log('[ElementCapturer] Capturing first section (with sticky elements visible)');

      const firstResponse = await Messaging.sendToBackground({
        action: 'captureVisibleTab',
      });

      if (!firstResponse.success) {
        throw new Error(`First capture failed: ${firstResponse.error}`);
      }

      const firstImg = await this.loadImage(firstResponse.imageData);
      const firstRect = element.getBoundingClientRect();

      // Progress update
      if (window.elementSelector) {
        window.elementSelector.updateCaptureProgress(1, '?');
      }

      // STEP 3: Hide internal sticky elements after first capture
      let stickyHeight = 0;
      if (Math.ceil(initialRect.height / viewportHeight) > 1) {
        console.log('[ElementCapturer] Hiding internal fixed/sticky elements');
        const hideResult = this.hideFixedElementsInsideTarget(element);
        hiddenInternalFixedElements = hideResult.elements;
        stickyHeight = hideResult.totalHeight;
        await this.waitForDOMUpdate();
        await this.delay(100);
      }

      // STEP 4: Recalculate element dimensions after hiding sticky elements
      const recalcRect = element.getBoundingClientRect();
      const elementWidth = recalcRect.width;
      const elementHeight = recalcRect.height;
      const elementAbsoluteTop = recalcRect.top + window.scrollY;
      const elementAbsoluteBottom = elementAbsoluteTop + elementHeight;

      // Calculate how much actual content was captured in first section (excluding sticky)
      const firstVisibleTop = Math.max(0, firstRect.top);
      const firstVisibleBottom = Math.min(viewportHeight, firstRect.bottom);
      const firstVisibleHeight = firstVisibleBottom - firstVisibleTop;
      const firstCaptureContentHeight = firstVisibleHeight - stickyHeight;

      // Recalculate number of captures needed based on remaining content
      const remainingContent = elementHeight - firstCaptureContentHeight;
      const remainingCaptures = Math.max(0, Math.ceil(remainingContent / viewportHeight));
      const numCaptures = 1 + remainingCaptures; // First capture + remaining

      console.log('[ElementCapturer] Recalculated stitching params:', {
        elementHeight,
        viewportHeight,
        numCaptures,
        elementAbsoluteTop,
        elementAbsoluteBottom,
        originalHeight: initialRect.height,
        heightChange: initialRect.height - elementHeight,
        stickyHeight,
        firstCaptureContentHeight,
        remainingContent,
        remainingCaptures,
      });

      // STEP 5: Create canvas with recalculated dimensions (include sticky in final image)
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = Math.round(elementWidth * dpr);
      finalCanvas.height = Math.round((elementHeight + stickyHeight) * dpr);
      const finalCtx = finalCanvas.getContext('2d');

      // STEP 6: Draw first captured section (includes sticky + content)
      finalCtx.drawImage(
        firstImg,
        Math.round(firstRect.left * dpr),
        Math.round(firstVisibleTop * dpr),
        Math.round(elementWidth * dpr),
        Math.round(firstVisibleHeight * dpr),
        0,
        0,
        Math.round(elementWidth * dpr),
        Math.round(firstVisibleHeight * dpr)
      );

      console.log('[ElementCapturer] First section stitched (includes sticky)');

      // STEP 7: Capture remaining sections, accounting for sticky height
      for (let i = 1; i < numCaptures; i++) {
        // Rate limiting
        console.log(`[ElementCapturer] Waiting 550ms (rate limit)`);
        await this.delay(550);

        // Calculate target scroll position: start from where first capture's content ended
        // First capture got: stickyHeight + firstCaptureContentHeight
        // Next capture starts at: elementAbsoluteTop + firstCaptureContentHeight
        const targetScrollY = elementAbsoluteTop + firstCaptureContentHeight + (i - 1) * viewportHeight;
        const maxScrollY = elementAbsoluteBottom - viewportHeight;
        const clampedScrollY = Math.min(targetScrollY, Math.max(maxScrollY, elementAbsoluteTop));

        // Scroll to position
        window.scrollTo({
          top: clampedScrollY,
          behavior: 'instant',
        });
        await this.waitForDOMUpdate();

        const actualScrollY = window.scrollY;

        console.log(
          `[ElementCapturer] Capture ${i + 1}/${numCaptures}: scroll=${actualScrollY}, target=${targetScrollY}`
        );

        // Progress update
        if (window.elementSelector) {
          window.elementSelector.updateCaptureProgress(i + 1, numCaptures);
        }

        // Capture viewport
        const response = await Messaging.sendToBackground({
          action: 'captureVisibleTab',
        });

        if (!response.success) {
          throw new Error(`Capture ${i + 1} failed: ${response.error}`);
        }

        const img = await this.loadImage(response.imageData);
        const currentRect = element.getBoundingClientRect();

        // Calculate visible portion
        const visibleTop = Math.max(0, currentRect.top);
        const visibleBottom = Math.min(viewportHeight, currentRect.bottom);
        const visibleHeight = visibleBottom - visibleTop;

        // Calculate canvas position accounting for sticky height
        // First capture is at canvas Y=0 and includes firstVisibleHeight (sticky + content)
        // Subsequent captures continue from firstVisibleHeight
        const offsetFromContentStart = actualScrollY - (elementAbsoluteTop + firstCaptureContentHeight);
        const destY = firstVisibleHeight + offsetFromContentStart;

        console.log('[ElementCapturer] Stitch params:', {
          section: i + 1,
          visibleTop,
          visibleHeight,
          offsetFromContentStart,
          destY,
        });

        // Draw section
        finalCtx.drawImage(
          img,
          Math.round(currentRect.left * dpr),
          Math.round(visibleTop * dpr),
          Math.round(elementWidth * dpr),
          Math.round(visibleHeight * dpr),
          0,
          Math.round(destY * dpr),
          Math.round(elementWidth * dpr),
          Math.round(visibleHeight * dpr)
        );

        console.log(`[ElementCapturer] Section ${i + 1} stitched at destY=${destY}`);
      }

      // Restore original scroll position
      window.scrollTo({
        top: originalScrollY,
        behavior: 'instant',
      });

      await this.waitForDOMUpdate();

      // Restore all hidden fixed/sticky elements (both external and internal)
      this.restoreFixedElements(hiddenExternalFixedElements);
      this.restoreFixedElements(hiddenInternalFixedElements);

      console.log('[ElementCapturer] Stitching complete');
      return finalCanvas.toDataURL('image/png');
    } catch (error) {
      // Restore scroll and fixed elements on error
      window.scrollTo({
        top: originalScrollY,
        behavior: 'instant',
      });

      this.restoreFixedElements(hiddenExternalFixedElements);
      this.restoreFixedElements(hiddenInternalFixedElements);

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
