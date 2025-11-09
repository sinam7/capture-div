/**
 * History Manager - Handles undo/redo functionality
 */

class HistoryManager {
  constructor(canvasManager, maxStates = 50) {
    this.canvasManager = canvasManager;
    this.maxStates = maxStates;
    this.states = [];
    this.currentIndex = -1;
  }

  /**
   * Saves the current canvas state
   */
  saveState() {
    // Remove any states after current index (when user did undo and then made a new change)
    this.states = this.states.slice(0, this.currentIndex + 1);

    // Save current canvas state
    const imageData = this.canvasManager.getImageData();
    this.states.push(imageData);

    // Limit the number of stored states
    if (this.states.length > this.maxStates) {
      this.states.shift();
    } else {
      this.currentIndex++;
    }

    this.updateButtons();
  }

  /**
   * Undoes the last action
   * @returns {boolean} True if undo was successful
   */
  undo() {
    if (!this.canUndo()) return false;

    this.currentIndex--;
    this.restoreState();
    this.updateButtons();
    return true;
  }

  /**
   * Redoes the last undone action
   * @returns {boolean} True if redo was successful
   */
  redo() {
    if (!this.canRedo()) return false;

    this.currentIndex++;
    this.restoreState();
    this.updateButtons();
    return true;
  }

  /**
   * Checks if undo is available
   * @returns {boolean}
   */
  canUndo() {
    return this.currentIndex > 0;
  }

  /**
   * Checks if redo is available
   * @returns {boolean}
   */
  canRedo() {
    return this.currentIndex < this.states.length - 1;
  }

  /**
   * Restores a state from history
   */
  restoreState() {
    if (this.currentIndex >= 0 && this.currentIndex < this.states.length) {
      const imageData = this.states[this.currentIndex];
      this.canvasManager.putImageData(imageData);
    }
  }

  /**
   * Clears all history
   */
  clear() {
    this.states = [];
    this.currentIndex = -1;
    this.updateButtons();
  }

  /**
   * Initializes history with current canvas state
   */
  init() {
    this.clear();
    this.saveState();
  }

  /**
   * Updates undo/redo button states
   */
  updateButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) {
      undoBtn.disabled = !this.canUndo();
    }

    if (redoBtn) {
      redoBtn.disabled = !this.canRedo();
    }
  }
}
