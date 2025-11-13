/**
 * i18n helper to retrieve localized message
 * @param {string} key
 * @param {string|string[]} [substitutions]
 * @returns {string}
 */
function getMessage(key, substitutions) {
  if (!key || !chrome?.i18n?.getMessage) {
    return '';
  }

  if (substitutions === undefined || substitutions === null) {
    return chrome.i18n.getMessage(key) || '';
  }

  const normalized =
    Array.isArray(substitutions) ? substitutions.map(String) : String(substitutions);

  return chrome.i18n.getMessage(key, normalized) || '';
}

/**
 * Populate elements that declare data-i18n attributes
 */
function applyI18nMessages() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (!key) {
      return;
    }

    const message = getMessage(key);
    if (!message) {
      return;
    }

    const attribute = element.getAttribute('data-i18n-attr');
    const isDynamic = element.dataset.i18nDynamic === 'true';

    if (attribute) {
      element.setAttribute(attribute, message);
      return;
    }

    if (element.dataset.i18nHtml === 'true') {
      element.innerHTML = message;
      return;
    }

    if (isDynamic && element.textContent.trim().length > 0) {
      return;
    }

    element.textContent = message;
  });
}
