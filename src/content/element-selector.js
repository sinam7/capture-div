/**
 * Main element selector controller
 * Handles element selection, slider UI, and screenshot capture coordination
 */

class ElementSelector {
  constructor() {
    console.log('[ElementSelector] Constructor called');
    this.isActive = false;
    this.highlighter = new ElementHighlighter();
    this.selectedElement = null;
    this.originalElement = null; // Store the originally clicked element
    this.deepestChild = null; // Store the deepest child for slider range
    this.hoveredElement = null;
    this.sliderContainer = null;
    this.currentDepth = 0;
    this.minDepth = 0; // Depth of root (usually 0)
    this.maxDepth = 0; // Depth of deepest child
    this.instructionsTimer = null; // Timer for auto-hiding instructions

    // Bound event handlers for proper cleanup
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
  }

  /**
   * Activates the element selector
   */
  activate() {
    console.log('[ElementSelector] activate() called, isActive:', this.isActive);
    if (this.isActive) return;

    this.isActive = true;
    this.attachEventListeners();
    this.showInstructions();
    console.log('[ElementSelector] Activated successfully');
  }

  /**
   * Deactivates the element selector
   */
  deactivate() {
    console.log('[ElementSelector] deactivate() called');
    if (!this.isActive) return;

    this.isActive = false;
    this.removeEventListeners();
    this.highlighter.removeHighlight();
    this.removeSlider();
    this.hideInstructions();
    this.selectedElement = null;
    this.originalElement = null;
    this.deepestChild = null;
    this.hoveredElement = null;
    console.log('[ElementSelector] Deactivated successfully');
  }

  /**
   * Attaches event listeners for element selection
   */
  attachEventListeners() {
    console.log('[ElementSelector] Attaching event listeners');
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('scroll', this.handleScroll, true);
  }

  /**
   * Removes event listeners
   */
  removeEventListeners() {
    console.log('[ElementSelector] Removing event listeners');
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('scroll', this.handleScroll, true);
  }

  /**
   * Handles mouse move events for hover highlighting
   * @param {MouseEvent} event - The mouse event
   */
  handleMouseMove(event) {
    if (!this.isActive || this.selectedElement) return;

    const element = event.target;

    if (DOMTraversal.shouldExcludeElement(element)) {
      return;
    }

    if (element !== this.hoveredElement) {
      this.hoveredElement = element;
      this.highlighter.highlight(element);
    }
  }

  /**
   * Handles click events for element selection
   * @param {MouseEvent} event - The click event
   */
  handleClick(event) {
    console.log('[ElementSelector] handleClick:', {
      isActive: this.isActive,
      target: event.target.tagName,
      targetClass: event.target.className,
      hasSelectedElement: !!this.selectedElement,
    });

    if (!this.isActive) {
      console.log('[ElementSelector] Not active, ignoring click');
      return;
    }

    // Check if click is on button or inside slider
    const clickedButton = event.target.closest('.element-selector__btn');
    const clickedSlider = event.target.closest('.element-selector__slider');
    const clickedInstructions = event.target.closest('.element-selector__instructions');

    if (clickedButton) {
      console.log('[ElementSelector] Clicked on button, letting button handler deal with it');
      // Don't prevent default or stop propagation - let button handlers work
      return;
    }

    if (clickedSlider) {
      console.log('[ElementSelector] Clicked inside slider (but not button), ignoring');
      return;
    }

    if (clickedInstructions) {
      console.log('[ElementSelector] Clicked on instructions, ignoring');
      return;
    }

    // Now we can prevent default for page elements
    event.preventDefault();
    event.stopPropagation();

    if (this.selectedElement) {
      // Click outside slider area - deselect
      console.log('[ElementSelector] Deselecting element (clicked outside slider)');
      this.deselectElement();
      return;
    }

    const element = event.target;

    if (DOMTraversal.shouldExcludeElement(element)) {
      console.log('[ElementSelector] Element should be excluded:', element.tagName);
      return;
    }

    console.log('[ElementSelector] Selecting element:', element.tagName, element.className);
    this.selectElement(element);
  }

  /**
   * Handles keyboard events
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyDown(event) {
    if (!this.isActive) return;

    console.log('[ElementSelector] Key pressed:', event.key);

    // ESC key - deactivate selector
    if (event.key === 'Escape') {
      console.log('[ElementSelector] ESC key pressed');
      if (this.selectedElement) {
        console.log('[ElementSelector] Deselecting element');
        this.deselectElement();
      } else {
        console.log('[ElementSelector] Deactivating selector');
        this.deactivate();
      }
      event.preventDefault();
    }

    // Arrow keys - adjust depth when element is selected
    if (this.selectedElement) {
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        console.log('[ElementSelector] Arrow Up/Left - selecting parent');
        this.adjustDepth(-1);
        event.preventDefault();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        console.log('[ElementSelector] Arrow Down/Right - selecting child');
        this.adjustDepth(1);
        event.preventDefault();
      }
    }
  }

  /**
   * Handles scroll events to update highlight position
   */
  handleScroll() {
    if (this.selectedElement) {
      this.highlighter.updatePosition(this.selectedElement);
      this.updateSliderPosition();
    } else if (this.hoveredElement) {
      this.highlighter.updatePosition(this.hoveredElement);
    }
  }

  /**
   * Selects an element and shows the slider
   * @param {HTMLElement} element - The element to select
   */
  selectElement(element) {
    console.log('[ElementSelector] selectElement() called for:', element.tagName);

    this.originalElement = element;
    this.selectedElement = element;
    this.currentDepth = DOMTraversal.getElementDepth(element);

    // Find the deepest visible child to set max depth
    this.deepestChild = DOMTraversal.getDeepestVisibleChild(element);
    this.maxDepth = DOMTraversal.getElementDepth(this.deepestChild);
    this.minDepth = 0; // Always allow going up to root

    console.log('[ElementSelector] Depth range:', {
      current: this.currentDepth,
      min: this.minDepth,
      max: this.maxDepth,
      originalElementTag: element.tagName,
      deepestChildTag: this.deepestChild.tagName,
    });

    this.highlighter.removeHighlight();
    this.highlighter.highlight(element);
    this.showSlider();
  }

  /**
   * Deselects the current element
   */
  deselectElement() {
    console.log('[ElementSelector] deselectElement() called');
    this.selectedElement = null;
    this.originalElement = null;
    this.deepestChild = null;
    this.highlighter.removeHighlight();
    this.removeSlider();
  }

  /**
   * Adjusts the selection depth
   * @param {number} delta - The depth change (-1 for parent, +1 for child)
   */
  adjustDepth(delta) {
    if (!this.selectedElement) return;

    const newDepth = Math.max(this.minDepth, Math.min(this.maxDepth, this.currentDepth + delta));

    console.log('[ElementSelector] adjustDepth:', {
      delta,
      oldDepth: this.currentDepth,
      newDepth,
      minDepth: this.minDepth,
      maxDepth: this.maxDepth,
    });

    if (newDepth !== this.currentDepth) {
      this.currentDepth = newDepth;
      this.updateSelectedElement();
    }
  }

  /**
   * Updates the selected element based on current depth
   */
  updateSelectedElement() {
    console.log('[ElementSelector] updateSelectedElement() - depth:', this.currentDepth);

    // Always traverse from the original clicked element
    const newElement = DOMTraversal.getElementAtDepth(this.originalElement, this.currentDepth);

    console.log('[ElementSelector] New element:', newElement ? newElement.tagName : 'null');

    if (newElement && newElement !== this.selectedElement) {
      this.selectedElement = newElement;
      this.highlighter.removeHighlight();
      this.highlighter.highlight(newElement);
      this.updateSliderValue();
    }
  }

  /**
   * Shows the slider UI
   */
  showSlider() {
    console.log('[ElementSelector] showSlider() called');
    this.removeSlider();

    this.sliderContainer = DOMUtils.createElement('div', {
      className: 'element-selector__slider',
      html: `
        <div class="element-selector__slider-content">
          <label class="element-selector__slider-label">
            <span>Parent</span>
            <input
              type="range"
              min="${this.minDepth}"
              max="${this.maxDepth}"
              value="${this.currentDepth}"
              class="element-selector__slider-input"
            />
            <span>Child</span>
          </label>
          <div class="element-selector__slider-info">
            ${DOMTraversal.getElementPath(this.selectedElement)}
          </div>
          <div class="element-selector__slider-actions">
            <button class="element-selector__btn element-selector__btn--capture">
              📸 Capture
            </button>
            <button class="element-selector__btn element-selector__btn--cancel">
              ✕ Cancel
            </button>
          </div>
        </div>
      `,
    });

    document.body.appendChild(this.sliderContainer);
    console.log('[ElementSelector] Slider appended to body');

    this.attachSliderListeners();
    this.updateSliderPosition();
  }

  /**
   * Attaches event listeners to slider controls
   */
  attachSliderListeners() {
    if (!this.sliderContainer) {
      console.log('[ElementSelector] No slider container, cannot attach listeners');
      return;
    }

    const slider = this.sliderContainer.querySelector('.element-selector__slider-input');
    const captureBtn = this.sliderContainer.querySelector('.element-selector__btn--capture');
    const cancelBtn = this.sliderContainer.querySelector('.element-selector__btn--cancel');

    console.log('[ElementSelector] attachSliderListeners:', {
      hasSlider: !!slider,
      hasCaptureBtn: !!captureBtn,
      hasCancelBtn: !!cancelBtn,
    });

    if (slider) {
      slider.addEventListener('input', (e) => {
        const newDepth = parseInt(e.target.value, 10);
        console.log('[ElementSelector] Slider changed to:', newDepth);
        this.currentDepth = newDepth;
        this.updateSelectedElement();
        this.updateSliderInfo();
      });
    }

    if (captureBtn) {
      const captureHandler = (e) => {
        console.log('[ElementSelector] Capture button clicked');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.captureElement();
      };
      captureBtn.addEventListener('click', captureHandler, true);
      captureBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      }, true);
      console.log('[ElementSelector] Capture button listener attached');
    }

    if (cancelBtn) {
      const cancelHandler = (e) => {
        console.log('[ElementSelector] Cancel button clicked');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.deselectElement();
      };
      cancelBtn.addEventListener('click', cancelHandler, true);
      cancelBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      }, true);
      console.log('[ElementSelector] Cancel button listener attached');
    }
  }

  /**
   * Updates the slider value to match current depth
   */
  updateSliderValue() {
    if (!this.sliderContainer) return;

    const slider = this.sliderContainer.querySelector('.element-selector__slider-input');
    if (slider) {
      slider.value = this.currentDepth;
      console.log('[ElementSelector] Slider value updated to:', this.currentDepth);
    }

    this.updateSliderInfo();
  }

  /**
   * Updates the slider info text
   */
  updateSliderInfo() {
    if (!this.sliderContainer) return;

    const info = this.sliderContainer.querySelector('.element-selector__slider-info');
    if (info) {
      info.textContent = DOMTraversal.getElementPath(this.selectedElement);
    }
  }

  /**
   * Updates slider position on scroll
   */
  updateSliderPosition() {
    // Slider is fixed at bottom, no position update needed
    // This method is here for potential future enhancements
  }

  /**
   * Removes the slider UI
   */
  removeSlider() {
    if (this.sliderContainer) {
      console.log('[ElementSelector] Removing slider');
      DOMUtils.removeElement(this.sliderContainer);
      this.sliderContainer = null;
    }
  }

  /**
   * Shows instruction overlay
   */
  showInstructions() {
    console.log('[ElementSelector] showInstructions() called');

    // First, hide any existing instructions
    this.hideInstructions();

    const instructions = DOMUtils.createElement('div', {
      id: 'element-selector-instructions',
      className: 'element-selector__instructions',
      html: `
        <div class="element-selector__instructions-content">
          <strong>Element Selection Active</strong>
          <p>Hover over elements and click to select</p>
          <p>Press <kbd>ESC</kbd> to cancel</p>
        </div>
      `,
    });

    document.body.appendChild(instructions);
    console.log('[ElementSelector] Instructions appended to body');

    // Auto-hide after 3 seconds
    this.instructionsTimer = setTimeout(() => {
      console.log('[ElementSelector] Instructions timer expired');
      this.hideInstructions();
    }, 3000);
  }

  /**
   * Hides instruction overlay
   */
  hideInstructions() {
    console.log('[ElementSelector] hideInstructions() called');

    // Clear the timer first
    if (this.instructionsTimer) {
      console.log('[ElementSelector] Clearing instructions timer');
      clearTimeout(this.instructionsTimer);
      this.instructionsTimer = null;
    }

    const instructions = document.getElementById('element-selector-instructions');
    if (instructions) {
      console.log('[ElementSelector] Removing instructions element');
      DOMUtils.removeElement(instructions);
    } else {
      console.log('[ElementSelector] No instructions element found to remove');
    }
  }

  /**
   * Captures the selected element as a screenshot
   */
  async captureElement() {
    console.log('[ElementSelector] captureElement() called');
    if (!this.selectedElement) {
      console.log('[ElementSelector] No element selected, aborting capture');
      return;
    }

    const captureBtn = this.sliderContainer?.querySelector('.element-selector__btn--capture');

    try {
      // Show loading state
      if (captureBtn) {
        captureBtn.textContent = '⏳ Capturing...';
        captureBtn.disabled = true;
      }

      // Temporarily hide our UI elements
      this.highlighter.removeHighlight();
      if (this.sliderContainer) {
        this.sliderContainer.style.display = 'none';
      }

      console.log('[ElementSelector] Calling ElementCapturer.capture()');

      // Capture the element using the capturer
      const imageData = await ElementCapturer.capture(this.selectedElement);

      console.log('[ElementSelector] Capture successful, image data length:', imageData.length);

      // Store the image and open editor
      await Messaging.sendToBackground({
        action: 'openEditor',
        imageData,
      });

      console.log('[ElementSelector] Editor open request sent');

      this.showNotification('Screenshot captured! Opening editor...');

      // Clean up
      this.deactivate();
    } catch (error) {
      console.error('[ElementSelector] Failed to capture element:', error);
      this.showNotification('Failed to capture screenshot. Please try again.');

      // Restore UI
      if (captureBtn) {
        captureBtn.textContent = '📸 Capture';
        captureBtn.disabled = false;
      }
      if (this.sliderContainer) {
        this.sliderContainer.style.display = 'block';
      }
      this.highlighter.highlight(this.selectedElement);
    }
  }

  /**
   * Shows a notification message
   * @param {string} message - The message to show
   */
  showNotification(message) {
    console.log('[ElementSelector] Showing notification:', message);
    const notification = DOMUtils.createElement('div', {
      className: 'element-selector__notification',
      html: message,
    });

    document.body.appendChild(notification);

    setTimeout(() => {
      DOMUtils.removeElement(notification);
    }, 3000);
  }

  /**
   * Cleans up all resources
   */
  destroy() {
    console.log('[ElementSelector] destroy() called');
    this.deactivate();
    this.highlighter.destroy();
  }
}

// Initialize element selector when script loads
let elementSelector = null;

console.log('[ElementSelector] Script loaded');

// Listen for messages from popup/background
Messaging.onMessage((message, sender, sendResponse) => {
  console.log('[ElementSelector] Message received:', message.action);

  if (message.action === 'startSelection') {
    if (!elementSelector) {
      console.log('[ElementSelector] Creating new ElementSelector instance');
      elementSelector = new ElementSelector();
    }
    elementSelector.activate();
    sendResponse({ success: true });
  } else if (message.action === 'stopSelection') {
    if (elementSelector) {
      elementSelector.deactivate();
    }
    sendResponse({ success: true });
  }
});
