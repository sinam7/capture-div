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
    console.log('[HistoryManager] Saving state');

    // Remove any states after current index (when user did undo and then made a new change)
    this.states = this.states.slice(0, this.currentIndex + 1);

    // Save current canvas state WITH dimensions (important for crop undo)
    const imageData = this.canvasManager.getImageData();
    const dimensions = this.canvasManager.getDimensions();

    this.states.push({
      imageData: imageData,
      width: dimensions.width,
      height: dimensions.height,
    });

    console.log('[HistoryManager] State saved with dimensions:', dimensions);

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
      const state = this.states[this.currentIndex];

      console.log('[HistoryManager] Restoring state with dimensions:', {
        width: state.width,
        height: state.height,
      });

      // Restore canvas dimensions first (important for crop undo)
      const canvas = this.canvasManager.canvas;
      if (canvas.width !== state.width || canvas.height !== state.height) {
        canvas.width = state.width;
        canvas.height = state.height;
        canvas.style.width = `${state.width}px`;
        canvas.style.height = `${state.height}px`;
        console.log('[HistoryManager] Canvas dimensions restored');
      }

      // Then restore image data
      this.canvasManager.putImageData(state.imageData);
      console.log('[HistoryManager] State restored successfully');
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
