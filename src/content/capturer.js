/**
 * Element screenshot capturer
 * Handles capturing screenshots of selected elements
 */

class ElementCapturer {
  // Adaptive rate limiting for Chrome quota (MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND)
  static currentCaptureDelay = 300; // Start at 300ms (faster than fixed 600ms, but safer than 100ms)
  static MIN_DELAY = 300;
  static MAX_DELAY = 1000;
  static DELAY_INCREMENT = 100;

  /**
   * Increase capture delay when quota errors occur
   */
  static increaseCaptureDelay() {
    this.currentCaptureDelay = Math.min(
      this.currentCaptureDelay + this.DELAY_INCREMENT,
      this.MAX_DELAY
    );
    console.log(`[ElementCapturer] Increased capture delay to ${this.currentCaptureDelay}ms due to quota limit`);
  }

  /**
   * Reset capture delay after successful capture operation
   */
  static resetCaptureDelay() {
    this.currentCaptureDelay = this.MIN_DELAY;
    console.log(`[ElementCapturer] Reset capture delay to ${this.currentCaptureDelay}ms`);
  }

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

    // Save original scroll positions BEFORE any scrolling operations
    const originalWindowScrollX = window.scrollX;
    const originalWindowScrollY = window.scrollY;
    const originalScrollableAncestors = this.saveScrollableAncestors(element);

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
    } finally {
      // Reset adaptive delay after capture operation completes
      this.resetCaptureDelay();
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
   * [UPDATED] Hides all fixed/sticky positioned elements on the page
   * Prevents them from appearing in screenshots or duplicating during stitching
   * Fixed elements are always hidden. Sticky elements are also always hidden
   * because they can become stuck at any scroll position during multi-scroll capture
   * @returns {Array} Array of {element, originalDisplay, originalVisibility, originalPosition}
   */
  static hideAllFixedStickyElements() {
    console.log('[ElementCapturer] Hiding ALL fixed/sticky positioned elements');
    const hiddenElements = [];
    const allElements = document.querySelectorAll('*');
    const viewportHeight = window.innerHeight;

    allElements.forEach((el) => {
      // Skip our own UI elements
      if (el.className && typeof el.className === 'string' && el.className.startsWith('element-selector__')) {
        return;
      }

      const computedStyle = window.getComputedStyle(el);
      const position = computedStyle.position;

      // Check if element is fixed or sticky positioned
      if (position === 'fixed' || position === 'sticky') {
        // Skip if already hidden (prevents duplicates in allHiddenElements array)
        if (el.style.display === 'none') {
          return;
        }

        // For 'fixed' elements, always hide (they're always floating)
        if (position === 'fixed') {
          hiddenElements.push({
            element: el,
            originalDisplay: el.style.display,
          });

          // Only use display: none to hide (don't touch position)
          el.style.display = 'none';
          return;
        }

        // For 'sticky' elements, always hide them regardless of current position
        // During multi-scroll capture, sticky elements can become stuck at any scroll position
        if (position === 'sticky') {
          hiddenElements.push({
            element: el,
            originalDisplay: el.style.display,
            originalVisibility: el.style.visibility,
            originalPosition: el.style.position,
          });

          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.position = 'static';

          console.log('[ElementCapturer] Hidden sticky element:', {
            tag: el.tagName,
            class: el.className,
          });
        }
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
      // Restore original display value (empty string removes inline style)
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
   * Uses smart alignment: 'start' for large elements (to capture from top),
   * 'center' for small elements (to avoid sticky headers)
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

      // Calculate real content height to determine alignment strategy
      const contentHeight = this.getRealContentHeight(element);

      // For large elements (taller than viewport), use 'start' to capture from top
      // For small elements, use 'center' to avoid sticky headers
      const blockAlignment = contentHeight > viewportHeight ? 'start' : 'center';

      console.log('[ElementCapturer] Scroll alignment:', {
        contentHeight,
        viewportHeight,
        alignment: blockAlignment,
        reason: blockAlignment === 'start' ? 'Large element - capture from top' : 'Small element - avoid sticky headers'
      });

      element.scrollIntoView({
        behavior: 'auto',
        block: blockAlignment,
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

    let imageDataUrl;
    try {
      if (needsStitching) {
        console.log('[ElementCapturer] Element larger than viewport, using multi-scroll capture');
        // Stitching handles sticky elements internally (checks at each scroll position)
        imageDataUrl = await this.captureWithStitching(element, initialRect, contentHeight, viewportHeight);
      } else {
        console.log('[ElementCapturer] Single viewport capture');
        // For single viewport, hide sticky elements here
        const hiddenElements = this.hideAllFixedStickyElements();
        await this.waitForDOMUpdate();

        try {
          // [FIX] Recalculate element position after hiding sticky elements
          // because hiding sticky elements can cause page scroll/layout changes
          const updatedRect = element.getBoundingClientRect();
          imageDataUrl = await this.captureSingleViewport(element, updatedRect, contentHeight);
        } finally {
          // Always restore sticky elements after single capture
          this.restoreFixedStickyElements(hiddenElements);
        }
      }
    } catch (error) {
      console.error('[ElementCapturer] Native capture failed:', error);
      throw error;
    }

    return imageDataUrl;
  }

  /**
   * [UPDATED] Captures element that fits in single viewport
   * Uses real content height instead of CSS computed height
   * Includes retry logic for Chrome quota errors
   * @param {HTMLElement} element - The element to capture
   * @param {DOMRect} rect - Element bounds
   * @param {number} contentHeight - The real content height
   * @returns {Promise<string>} Data URL of the captured image
   */
  static async captureSingleViewport(element, rect, contentHeight) {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
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
          const errorMsg = response.error || 'Capture failed';

          // Check if it's a quota error
          if (errorMsg.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND')) {
            lastError = new Error(errorMsg);
            console.warn(`[ElementCapturer] Quota exceeded, retrying (${attempt}/${maxRetries})...`);

            // Increase delay for future captures
            this.increaseCaptureDelay();

            // Wait 1 second before retrying to respect quota limit
            await this.delay(1000);
            continue;
          }

          throw new Error(errorMsg);
        }

        // Crop to element bounds using real content height
        return await this.cropImage(response.imageData, rect, window.devicePixelRatio, contentHeight);

      } catch (error) {
        // If it's a quota error and we have retries left, continue
        if (error.message.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND') && attempt < maxRetries) {
          lastError = error;
          console.warn(`[ElementCapturer] Quota exceeded, retrying (${attempt}/${maxRetries})...`);

          // Increase delay for future captures
          this.increaseCaptureDelay();

          await this.delay(1000);
          continue;
        }

        // Otherwise, throw the error
        throw error;
      }
    }

    // If we exhausted all retries, throw the last error
    throw lastError || new Error('Capture failed after all retries');
  }

  /**
   * Finds all scrollable ancestor elements and saves their scroll positions
   * @param {HTMLElement} element - Starting element
   * @returns {Array} Array of {element, scrollLeft, scrollTop}
   */
  static saveScrollableAncestors(element) {
    const scrollableAncestors = [];
    let current = element;

    while (current && current !== document.body && current !== document.documentElement) {
      const hasHorizontalScroll = current.scrollWidth > current.clientWidth;
      const hasVerticalScroll = current.scrollHeight > current.clientHeight;
      const scrollLeft = current.scrollLeft;
      const scrollTop = current.scrollTop;

      // Save if element has scroll offset or is scrollable
      if (hasHorizontalScroll || hasVerticalScroll || scrollLeft !== 0 || scrollTop !== 0) {
        scrollableAncestors.push({
          element: current,
          scrollLeft: scrollLeft,
          scrollTop: scrollTop
        });
      }

      current = current.parentElement;
    }

    console.log(`[ElementCapturer] Saved ${scrollableAncestors.length} scrollable ancestors`);
    return scrollableAncestors;
  }

  /**
   * Restores scroll positions of ancestor elements
   * @param {Array} scrollableAncestors - Array of {element, scrollLeft, scrollTop}
   */
  static restoreScrollableAncestors(scrollableAncestors) {
    console.log(`[ElementCapturer] Restoring ${scrollableAncestors.length} scrollable ancestors`);
    scrollableAncestors.forEach(({ element, scrollLeft, scrollTop }) => {
      element.scrollLeft = scrollLeft;
      element.scrollTop = scrollTop;
    });
  }

  /**
   * [UPDATED] Captures tall element using multiple scrolls and stitches them together
   * Uses real content height to avoid gray space from CSS min-height
   * Hides sticky elements BEFORE any scrolling to prevent layout changes
   * @param {HTMLElement} element - The element to capture
   * @param {DOMRect} initialRect - Initial element bounds
   * @param {number} contentHeight - The real content height
   * @param {number} viewportHeight - window.innerHeight
   * @returns {Promise<string>} Data URL of the stitched image
   */
  static async captureWithStitching(element, initialRect, contentHeight, viewportHeight) {
    const dpr = window.devicePixelRatio;
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;

    // Save scrollable ancestor elements' scroll positions
    const scrollableAncestors = this.saveScrollableAncestors(element);

    // Track all hidden elements across all scroll positions
    const allHiddenElements = [];

    try {
      // [FIX] Hide sticky elements BEFORE scrolling to prevent layout changes
      const hiddenElements = this.hideAllFixedStickyElements();
      allHiddenElements.push(...hiddenElements);
      await this.waitForDOMUpdate();

      // Recalculate element position after hiding sticky elements
      const updatedRect = element.getBoundingClientRect();

      // 1. Scroll to top of element (using updated position)
      window.scrollTo({
        left: originalScrollX,
        top: updatedRect.top + window.scrollY,
        behavior: 'instant',
      });
      // Restore parent container scroll positions in case they were affected
      this.restoreScrollableAncestors(scrollableAncestors);
      await this.waitForDOMUpdate();

      const elementWidth = updatedRect.width;
      const elementAbsoluteTop = updatedRect.top + window.scrollY;

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
        // Calculate remaining height before this capture
        const remainingHeight = contentHeight - capturedHeight;

        // [FIXED] For last capture with remaining < viewport, scroll to show element bottom
        // This ensures the last section fills the viewport from bottom instead of top
        let scrollY;
        if (remainingHeight < viewportHeight && i === numCaptures - 1) {
          // Last capture: align element bottom with viewport bottom
          scrollY = elementAbsoluteTop + contentHeight - viewportHeight;
          console.log(`[ElementCapturer] Last capture: scrolling to bottom, remainingHeight=${remainingHeight}`);
        } else {
          // Normal capture: continue from where previous capture ended
          scrollY = elementAbsoluteTop + capturedHeight;
        }

        window.scrollTo({ left: originalScrollX, top: scrollY, behavior: 'instant' });
        // Restore parent container scroll positions in case they were affected
        this.restoreScrollableAncestors(scrollableAncestors);
        await this.waitForDOMUpdate();

        // [FIX] Re-check and hide fixed/sticky elements after scroll
        // Some elements may dynamically become fixed/sticky based on scroll position
        const newHiddenElements = this.hideAllFixedStickyElements();
        allHiddenElements.push(...newHiddenElements);
        await this.waitForDOMUpdate();

        // Log capture progress
        console.log(`[ElementCapturer] Capture ${i + 1}/${numCaptures}, scrollY=${scrollY}, capturedHeight=${capturedHeight}`);

        // Update progress indicator
        if (window.elementSelector) {
          window.elementSelector.updateCaptureProgress(i + 1, numCaptures);
        }

        // Capture viewport with retry logic for quota errors
        let response;
        const maxRetries = 3;
        let captureSuccess = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          response = await Messaging.sendToBackground({ action: 'captureVisibleTab' });

          if (response.success) {
            captureSuccess = true;
            break;
          }

          // Check if it's a quota error
          if (response.error && response.error.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND')) {
            console.warn(`[ElementCapturer] Quota exceeded on capture ${i + 1}, retrying (${attempt}/${maxRetries})...`);

            // Increase delay for future captures
            this.increaseCaptureDelay();

            // Wait 1 second before retrying
            if (attempt < maxRetries) {
              await this.delay(1000);
              continue;
            }
          }

          // If not a quota error or last retry, break
          break;
        }

        if (!captureSuccess) {
          throw new Error(`Capture ${i + 1} failed: ${response.error}`);
        }

        const img = await this.loadImage(response.imageData);
        const currentRect = element.getBoundingClientRect();

        // 5. Calculate visible portion of element in current viewport
        const visibleTop = Math.max(0, currentRect.top);
        const visibleBottom = Math.min(viewportHeight, currentRect.bottom);
        const visibleHeight = visibleBottom - visibleTop;

        // Calculate how much we should actually capture (limited by remaining content)
        // remainingHeight already calculated at loop start
        const captureHeight = Math.min(visibleHeight, remainingHeight);

        // For last capture that was scrolled to bottom, adjust sourceY
        let sourceY = visibleTop;
        if (remainingHeight < viewportHeight && i === numCaptures - 1) {
          // Element's bottom is aligned with viewport bottom
          // Calculate where our capture section starts in viewport
          sourceY = capturedHeight - (contentHeight - viewportHeight);
          console.log(`[ElementCapturer] Last capture sourceY adjustment: ${sourceY} (capturedHeight=${capturedHeight}, contentHeight=${contentHeight})`);
        }

        console.log('[ElementCapturer] Stitch section:', {
          section: i + 1,
          visibleTop,
          visibleBottom,
          visibleHeight,
          remainingHeight,
          captureHeight,
          capturedHeight,
          sourceY
        });

        // 6. Draw to canvas
        finalCtx.drawImage(
          img,
          Math.round(currentRect.left * dpr),    // source x
          Math.round(sourceY * dpr),             // source y (adjusted for last capture)
          Math.round(elementWidth * dpr),        // source width
          Math.round(captureHeight * dpr),       // source height (actual visible height)
          0,                                     // dest x
          Math.round(capturedHeight * dpr),      // dest y (accumulated height)
          Math.round(elementWidth * dpr),        // dest width
          Math.round(captureHeight * dpr)        // dest height
        );

        capturedHeight += captureHeight;

        // Adaptive rate limiting: Chrome enforces MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND (2 per second)
        // Delay increases if quota errors occur, resets after capture completes
        await this.delay(this.currentCaptureDelay);
      }

      console.log('[ElementCapturer] Stitching complete');
      return finalCanvas.toDataURL('image/png');

    } finally {
      // Always restore scroll positions (window and scrollable ancestors) and hidden elements
      window.scrollTo({ left: originalScrollX, top: originalScrollY, behavior: 'instant' });
      this.restoreScrollableAncestors(scrollableAncestors);
      this.restoreFixedStickyElements(allHiddenElements);
      await this.waitForDOMUpdate();
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
