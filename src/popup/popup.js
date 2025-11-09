/**
 * Popup UI logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const startSelectionBtn = document.getElementById('startSelectionBtn');

  startSelectionBtn.addEventListener('click', async () => {
    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id) {
        showStatus('No active tab found', 'error');
        return;
      }

      // Send message to content script to start selection
      await chrome.tabs.sendMessage(tab.id, { action: 'startSelection' });

      // Show success status
      showStatus('Selection mode activated!', 'success');

      // Close popup after short delay
      setTimeout(() => {
        window.close();
      }, 500);
    } catch (error) {
      console.error('Failed to start selection:', error);
      showStatus('Failed to start selection. Please refresh the page.', 'error');
    }
  });

  /**
   * Shows a status message in the popup
   * @param {string} message - The message to display
   * @param {string} type - The status type (success, error, info)
   */
  function showStatus(message, type = 'info') {
    // Remove existing status
    const existingStatus = document.querySelector('.popup-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    // Create new status element
    const status = document.createElement('div');
    status.className = `popup-status popup-status--${type}`;
    status.textContent = message;

    // Insert after description
    const description = document.querySelector('.popup-description');
    if (description) {
      description.after(status);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      status.remove();
    }, 5000);
  }
});
