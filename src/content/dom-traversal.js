/**
 * DOM tree traversal utilities for element hierarchy navigation
 */

class DOMTraversal {
  /**
   * Gets the depth of an element in the DOM tree
   * @param {HTMLElement} element - The element to measure
   * @returns {number} The depth (0 for document root)
   */
  static getElementDepth(element) {
    if (!element) return 0;

    let depth = 0;
    let current = element;

    while (current.parentElement) {
      depth++;
      current = current.parentElement;
    }

    return depth;
  }

  /**
   * Gets all ancestors of an element
   * @param {HTMLElement} element - The element to get ancestors for
   * @returns {HTMLElement[]} Array of ancestor elements from parent to root
   */
  static getAncestors(element) {
    if (!element) return [];

    const ancestors = [];
    let current = element.parentElement;

    while (current) {
      ancestors.push(current);
      current = current.parentElement;
    }

    return ancestors;
  }

  /**
   * Gets the element at a specific depth in the hierarchy
   * @param {HTMLElement} element - The starting element
   * @param {number} targetDepth - The desired depth
   * @returns {HTMLElement|null} The element at target depth, or null
   */
  static getElementAtDepth(element, targetDepth) {
    if (!element) return null;

    const currentDepth = this.getElementDepth(element);

    if (currentDepth === targetDepth) {
      return element;
    }

    if (currentDepth < targetDepth) {
      // Can't go deeper than current element
      return element;
    }

    // Traverse up to target depth
    let current = element;
    let steps = currentDepth - targetDepth;

    while (steps > 0 && current.parentElement) {
      current = current.parentElement;
      steps--;
    }

    return current;
  }

  /**
   * Gets the parent element if it exists
   * @param {HTMLElement} element - The current element
   * @returns {HTMLElement|null} The parent element or null
   */
  static getParent(element) {
    if (!element) return null;
    return element.parentElement;
  }

  /**
   * Gets the first visible child element
   * @param {HTMLElement} element - The parent element
   * @returns {HTMLElement|null} The first visible child or null
   */
  static getFirstVisibleChild(element) {
    if (!element || !element.children) return null;

    for (let child of element.children) {
      if (DOMUtils.isElementVisible(child)) {
        return child;
      }
    }

    return null;
  }

  /**
   * Gets all visible children of an element
   * @param {HTMLElement} element - The parent element
   * @returns {HTMLElement[]} Array of visible child elements
   */
  static getVisibleChildren(element) {
    if (!element || !element.children) return [];

    return Array.from(element.children).filter((child) =>
      DOMUtils.isElementVisible(child)
    );
  }

  /**
   * Builds a path string for an element (e.g., "html > body > div > p")
   * @param {HTMLElement} element - The element to build path for
   * @returns {string} The element path
   */
  static getElementPath(element) {
    if (!element) return '';

    const path = [];
    let current = element;

    while (current && current.tagName) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        const firstClass = current.className.split(' ')[0];
        if (firstClass) {
          selector += `.${firstClass}`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * Checks if an element should be excluded from selection
   * @param {HTMLElement} element - The element to check
   * @returns {boolean} True if element should be excluded
   */
  static shouldExcludeElement(element) {
    if (!element) return true;

    // Exclude our own UI elements
    if (
      element.classList.contains('element-selector__highlight') ||
      element.classList.contains('element-selector__tooltip') ||
      element.classList.contains('element-selector__slider') ||
      element.id === 'element-selector-container'
    ) {
      return true;
    }

    // Exclude script and style tags
    const excludedTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK'];
    if (excludedTags.includes(element.tagName)) {
      return true;
    }

    return false;
  }

  /**
   * Gets the nearest selectable ancestor
   * @param {HTMLElement} element - The starting element
   * @returns {HTMLElement|null} The nearest selectable ancestor
   */
  static getNearestSelectableAncestor(element) {
    let current = element;

    while (current) {
      if (!this.shouldExcludeElement(current) && DOMUtils.isElementVisible(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }
}
