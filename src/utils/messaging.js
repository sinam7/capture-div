/**
 * Chrome extension messaging utilities
 */

const Messaging = {
  // Maximum message size before using storage API (40MB to be safe)
  MAX_MESSAGE_SIZE: 40 * 1024 * 1024,

  /**
   * Sends a message to the background script
   * Automatically uses chrome.storage.local for large payloads
   * @param {Object} message - The message object
   * @returns {Promise<any>} Response from background script
   */
  async sendToBackground(message) {
    // Check if message contains large imageData
    if (message.imageData) {
      const dataSize = message.imageData.length;

      if (dataSize > this.MAX_MESSAGE_SIZE) {
        console.log(`[Messaging] Large image data detected (${(dataSize / 1024 / 1024).toFixed(2)}MB), using storage API`);

        // Store image data in chrome.storage.local
        const storageKey = `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
          await chrome.storage.local.set({ [storageKey]: message.imageData });

          // Send message with storage key instead of image data
          const modifiedMessage = { ...message, imageData: null, storageKey };

          return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(modifiedMessage, async (response) => {
              // Clean up storage after receiving response
              try {
                await chrome.storage.local.remove(storageKey);
              } catch (cleanupError) {
                console.warn('[Messaging] Failed to cleanup storage:', cleanupError);
              }

              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            });
          });
        } catch (storageError) {
          throw new Error(`Failed to store large image data: ${storageError.message}`);
        }
      }
    }

    // Normal message sending for small payloads
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
