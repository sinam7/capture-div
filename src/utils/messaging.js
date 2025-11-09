/**
 * Chrome extension messaging utilities
 */

const Messaging = {
  /**
   * Sends a message to the background script
   * @param {Object} message - The message object
   * @returns {Promise<any>} Response from background script
   */
  async sendToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  },

  /**
   * Sends a message to a specific tab
   * @param {number} tabId - The tab ID
   * @param {Object} message - The message object
   * @returns {Promise<any>} Response from content script
   */
  async sendToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  },

  /**
   * Listens for messages from background or content scripts
   * @param {Function} callback - Callback function (message, sender, sendResponse) => {}
   */
  onMessage(callback) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const result = callback(message, sender, sendResponse);

      // If callback returns a promise, handle it
      if (result instanceof Promise) {
        result.then(sendResponse).catch((error) => {
          console.error('Message handler error:', error);
          sendResponse({ error: error.message });
        });
        return true; // Keep channel open for async response
      }

      return false;
    });
  },
};
