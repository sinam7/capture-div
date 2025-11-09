/**
 * Element highlighter for visual feedback during element selection
 */

class ElementHighlighter {
  constructor() {
    this.overlay = null;
    this.tooltip = null;
    this.currentElement = null;
  }

  /**
   * Highlights an element with a visual overlay
   * @param {HTMLElement} element - The element to highlight
   */
  highlight(element) {
    if (!element || element === this.currentElement) {
      return;
    }

    this.currentElement = element;
    this.removeHighlight();
    this.createOverlay(element);
    this.createTooltip(element);
  }

  /**
   * Creates the highlight overlay
   * @param {HTMLElement} element - The element to overlay
   */
  createOverlay(element) {
    const rect = element.getBoundingClientRect();

    this.overlay = DOMUtils.createElement('div', {
      className: 'element-selector__highlight',
      styles: {
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        pointerEvents: 'none',
        zIndex: '2147483646',
      },
    });

    document.body.appendChild(this.overlay);
  }

  /**
   * Creates a tooltip showing element information
   * @param {HTMLElement} element - The element to show info for
   */
  createTooltip(element) {
    const rect = element.getBoundingClientRect();
    const tagName = element.tagName.toLowerCase();
    const elementId = element.id ? `#${element.id}` : '';
    const elementClass = element.className ? `.${element.className.split(' ')[0]}` : '';
    const dimensions = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;

    const tooltipText = `${tagName}${elementId}${elementClass} (${dimensions})`;

    this.tooltip = DOMUtils.createElement('div', {
      className: 'element-selector__tooltip',
      html: tooltipText,
      styles: {
        position: 'fixed',
        top: `${Math.max(rect.top - 25, 5)}px`,
        left: `${rect.left}px`,
        pointerEvents: 'none',
        zIndex: '2147483647',
      },
    });

    document.body.appendChild(this.tooltip);
  }

  /**
   * Removes the highlight overlay and tooltip
   */
  removeHighlight() {
    if (this.overlay) {
      DOMUtils.removeElement(this.overlay);
      this.overlay = null;
    }

    if (this.tooltip) {
      DOMUtils.removeElement(this.tooltip);
      this.tooltip = null;
    }

    this.currentElement = null;
  }

  /**
   * Updates the highlight position (useful for scroll events)
   * @param {HTMLElement} element - The element to update highlight for
   */
  updatePosition(element) {
    if (!element || !this.overlay) {
      return;
    }

    const rect = element.getBoundingClientRect();

    this.overlay.style.top = `${rect.top}px`;
    this.overlay.style.left = `${rect.left}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;

    if (this.tooltip) {
      this.tooltip.style.top = `${Math.max(rect.top - 25, 5)}px`;
      this.tooltip.style.left = `${rect.left}px`;
    }
  }

  /**
   * Cleans up all resources
   */
  destroy() {
    this.removeHighlight();
  }
}
