/**
 * Main element selector controller
 * Handles element selection, slider UI, and screenshot capture coordination
 */

class ElementSelector {
  constructor() {
    this.isActive = false;
    this.highlighter = new ElementHighlighter();
    this.selectedElement = null;
    this.originalElement = null; // Store the originally clicked element
    this.hoveredElement = null;
    this.sliderContainer = null;
    this.currentDepth = 0;
    this.maxDepth = 0;
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
    if (this.isActive) return;

    this.isActive = true;
    this.attachEventListeners();
    this.showInstructions();
  }

  /**
   * Deactivates the element selector
   */
  deactivate() {
    if (!this.isActive) return;

    this.isActive = false;
    this.removeEventListeners();
    this.highlighter.removeHighlight();
    this.removeSlider();
    this.hideInstructions();
    this.selectedElement = null;
    this.originalElement = null;
    this.hoveredElement = null;
  }

  /**
   * Attaches event listeners for element selection
   */
  attachEventListeners() {
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('scroll', this.handleScroll, true);
  }

  /**
   * Removes event listeners
   */
  removeEventListeners() {
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
    if (!this.isActive) return;

    event.preventDefault();
    event.stopPropagation();

    if (this.selectedElement) {
      // Click outside slider area - deselect
      if (!event.target.closest('.element-selector__slider')) {
        this.deselectElement();
      }
      return;
    }

    const element = event.target;

    if (DOMTraversal.shouldExcludeElement(element)) {
      return;
    }

    this.selectElement(element);
  }

  /**
   * Handles keyboard events
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyDown(event) {
    if (!this.isActive) return;

    // ESC key - deactivate selector
    if (event.key === 'Escape') {
      if (this.selectedElement) {
        this.deselectElement();
      } else {
        this.deactivate();
      }
      event.preventDefault();
    }

    // Arrow keys - adjust depth when element is selected
    if (this.selectedElement) {
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        this.adjustDepth(-1);
        event.preventDefault();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
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
    this.originalElement = element; // Store the originally clicked element
    this.selectedElement = element;
    this.currentDepth = DOMTraversal.getElementDepth(element);
    this.maxDepth = this.currentDepth;

    this.highlighter.removeHighlight();
    this.highlighter.highlight(element);
    this.showSlider();
  }

  /**
   * Deselects the current element
   */
  deselectElement() {
    this.selectedElement = null;
    this.highlighter.removeHighlight();
    this.removeSlider();
  }

  /**
   * Adjusts the selection depth
   * @param {number} delta - The depth change (-1 for parent, +1 for child)
   */
  adjustDepth(delta) {
    if (!this.selectedElement) return;

    const newDepth = Math.max(0, Math.min(this.maxDepth, this.currentDepth + delta));

    if (newDepth !== this.currentDepth) {
      this.currentDepth = newDepth;
      this.updateSelectedElement();
    }
  }

  /**
   * Updates the selected element based on current depth
   */
  updateSelectedElement() {
    // Always traverse from the original clicked element
    const newElement = DOMTraversal.getElementAtDepth(this.originalElement, this.currentDepth);

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
    this.removeSlider();

    this.sliderContainer = DOMUtils.createElement('div', {
      className: 'element-selector__slider',
      html: `
        <div class="element-selector__slider-content">
          <label class="element-selector__slider-label">
            <span>Parent</span>
            <input
              type="range"
              min="0"
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
    this.attachSliderListeners();
    this.updateSliderPosition();
  }

  /**
   * Attaches event listeners to slider controls
   */
  attachSliderListeners() {
    if (!this.sliderContainer) return;

    const slider = this.sliderContainer.querySelector('.element-selector__slider-input');
    const captureBtn = this.sliderContainer.querySelector('.element-selector__btn--capture');
    const cancelBtn = this.sliderContainer.querySelector('.element-selector__btn--cancel');

    if (slider) {
      slider.addEventListener('input', (e) => {
        this.currentDepth = parseInt(e.target.value, 10);
        this.updateSelectedElement();
        this.updateSliderInfo();
      });
    }

    if (captureBtn) {
      captureBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.captureElement();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.deselectElement();
      });
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
      DOMUtils.removeElement(this.sliderContainer);
      this.sliderContainer = null;
    }
  }

  /**
   * Shows instruction overlay
   */
  showInstructions() {
    // Clear any existing timer
    if (this.instructionsTimer) {
      clearTimeout(this.instructionsTimer);
      this.instructionsTimer = null;
    }

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

    // Auto-hide after 3 seconds
    this.instructionsTimer = setTimeout(() => {
      this.hideInstructions();
    }, 3000);
  }

  /**
   * Hides instruction overlay
   */
  hideInstructions() {
    // Clear the timer
    if (this.instructionsTimer) {
      clearTimeout(this.instructionsTimer);
      this.instructionsTimer = null;
    }

    const instructions = document.getElementById('element-selector-instructions');
    if (instructions) {
      DOMUtils.removeElement(instructions);
    }
  }

  /**
   * Captures the selected element as a screenshot
   */
  async captureElement() {
    if (!this.selectedElement) return;

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

      // Capture the element using the capturer
      const imageData = await ElementCapturer.capture(this.selectedElement);

      // Store the image and open editor
      await Messaging.sendToBackground({
        action: 'openEditor',
        imageData,
      });

      this.showNotification('Screenshot captured! Opening editor...');

      // Clean up
      this.deactivate();
    } catch (error) {
      console.error('Failed to capture element:', error);
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
    this.deactivate();
    this.highlighter.destroy();
  }
}

// Initialize element selector when script loads
let elementSelector = null;

// Listen for messages from popup/background
Messaging.onMessage((message, sender, sendResponse) => {
  if (message.action === 'startSelection') {
    if (!elementSelector) {
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
