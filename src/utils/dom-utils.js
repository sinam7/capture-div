/**
 * DOM utility functions for element manipulation and querying
 */

const DOMUtils = {
  /**
   * Gets the computed bounding rectangle of an element including scroll offset
   * @param {HTMLElement} element - The element to measure
   * @returns {DOMRect} The bounding rectangle
   */
  getAbsoluteBoundingRect(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      right: rect.right + window.scrollX,
      bottom: rect.bottom + window.scrollY,
      width: rect.width,
      height: rect.height,
      x: rect.x + window.scrollX,
      y: rect.y + window.scrollY,
    };
  },

  /**
   * Checks if an element is visible in the viewport
   * @param {HTMLElement} element - The element to check
   * @returns {boolean} True if element is visible
   */
  isElementVisible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  },

  /**
   * Creates a unique selector for an element
   * @param {HTMLElement} element - The element to create selector for
   * @returns {string} CSS selector string
   */
  getElementSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = Array.from(element.classList).join('.');
      if (classes) {
        return `${element.tagName.toLowerCase()}.${classes}`;
      }
    }

    return element.tagName.toLowerCase();
  },

  /**
   * Removes all children from an element
   * @param {HTMLElement} element - The element to clear
   */
  clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  },

  /**
   * Safely removes an element from the DOM
   * @param {HTMLElement} element - The element to remove
   */
  removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  },

  /**
   * Creates an element with attributes and styles
   * @param {string} tag - HTML tag name
   * @param {Object} options - Element options
   * @param {Object} [options.attributes] - HTML attributes
   * @param {Object} [options.styles] - CSS styles
   * @param {string} [options.className] - CSS class name
   * @param {string} [options.html] - Inner HTML
   * @returns {HTMLElement} The created element
   */
  createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) {
      element.className = options.className;
    }

    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }

    if (options.styles) {
      Object.entries(options.styles).forEach(([key, value]) => {
        element.style[key] = value;
      });
    }

    if (options.html) {
      element.innerHTML = options.html;
    }

    return element;
  },

  /**
   * Throttles a function execution
   * @param {Function} func - The function to throttle
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func.apply(this, args);
      }
    };
  },

  /**
   * Debounces a function execution
   * @param {Function} func - The function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },
};
