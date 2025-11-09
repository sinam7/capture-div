/**
 * Background service worker
 * Handles screenshot capture coordination and editor page opening
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Element Screenshot Editor installed');
  } else if (details.reason === 'update') {
    console.log('Element Screenshot Editor updated');
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureElement') {
    handleCaptureElement(message, sender.tab)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => {
        console.error('Capture failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (message.action === 'captureVisibleTab') {
    handleCaptureVisibleTab(sender.tab.id, message)
      .then((imageData) => sendResponse({ success: true, imageData }))
      .catch((error) => {
        console.error('Capture visible tab failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.action === 'openEditor') {
    handleOpenEditor(message.imageData)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error('Failed to open editor:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

/**
 * Captures the visible tab area
 * @param {number} tabId - The tab ID to capture
 * @param {Object} options - Capture options
 * @returns {Promise<string>} Data URL of captured screenshot
 */
async function handleCaptureVisibleTab(tabId, options) {
  try {
    const imageData = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
    });

    return imageData;
  } catch (error) {
    console.error('Failed to capture visible tab:', error);
    throw error;
  }
}

/**
 * Handles element capture request
 * @param {Object} message - The capture request message
 * @param {chrome.tabs.Tab} tab - The tab where capture was requested
 * @returns {Promise<Object>} Capture result
 */
async function handleCaptureElement(message, tab) {
  try {
    // Inject html2canvas library if not already injected
    await injectHtml2Canvas(tab.id);

    // Execute capture script in the tab
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: captureElementInPage,
      args: [message.elementSelector],
    });

    if (!result || !result[0]?.result) {
      throw new Error('Failed to capture element');
    }

    const imageData = result[0].result;

    // Store image data
    await chrome.storage.local.set({
      capturedImage: imageData,
      captureTimestamp: Date.now(),
    });

    // Open editor in new tab
    await openEditorTab();

    return { imageData };
  } catch (error) {
    console.error('Error in handleCaptureElement:', error);
    throw error;
  }
}

/**
 * Injects html2canvas library into the page
 * @param {number} tabId - The tab ID
 */
async function injectHtml2Canvas(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['libs/html2canvas.min.js'],
    });
  } catch (error) {
    console.error('Failed to inject html2canvas:', error);
    throw new Error('Failed to load screenshot library');
  }
}

/**
 * Captures element in the page context
 * This function runs in the page context, not in the extension context
 * @param {string} elementSelector - CSS selector for the element
 * @returns {Promise<string>} Data URL of captured image
 */
async function captureElementInPage(elementSelector) {
  // Find the element (this is a simplified approach)
  // In reality, we'll capture using the already selected element
  const element = window.elementSelector?.selectedElement || document.querySelector(elementSelector);

  if (!element) {
    throw new Error('Element not found');
  }

  // Use html2canvas to capture the element
  const canvas = await html2canvas(element, {
    allowTaint: true,
    useCORS: true,
    scrollY: -window.scrollY,
    scrollX: -window.scrollX,
    backgroundColor: null,
    logging: false,
  });

  return canvas.toDataURL('image/png');
}

/**
 * Opens the editor in a new tab
 * @returns {Promise<chrome.tabs.Tab>} The created tab
 */
async function openEditorTab() {
  const editorUrl = chrome.runtime.getURL('src/editor/index.html');

  const tab = await chrome.tabs.create({
    url: editorUrl,
    active: true,
  });

  return tab;
}

/**
 * Handles opening the editor with image data
 * @param {string} imageData - Base64 encoded image data
 * @returns {Promise<void>}
 */
async function handleOpenEditor(imageData) {
  await chrome.storage.local.set({
    capturedImage: imageData,
    captureTimestamp: Date.now(),
  });

  await openEditorTab();
}
