/* background/service-worker.js */
'use strict';

const JSON_CONTENT_TYPES = ['application/json', 'text/json', 'application/x-json'];

// Detect JSON pages via response headers
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type !== 'main_frame') return;
    const ct = details.responseHeaders?.find(
      h => h.name.toLowerCase() === 'content-type'
    );
    if (!ct) return;
    const isJson = JSON_CONTENT_TYPES.some(t => ct.value.toLowerCase().includes(t));
    if (!isJson) return;

    // Flag this tab for the content script
    chrome.storage.session.set({ [`tab_${details.tabId}_isJson`]: true }).catch(() => {});

    // Badge
    chrome.action.setBadgeText({ text: '{}', tabId: details.tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#89b4fa', tabId: details.tabId });
    chrome.action.setBadgeTextColor({ color: '#1e1e2e', tabId: details.tabId });
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Clean up on tab close / navigation away
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`tab_${tabId}_isJson`).catch(() => {});
  chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.storage.session.remove(`tab_${tabId}_isJson`).catch(() => {});
  }
});

// Handle messages from content scripts / popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PRISM_TOGGLE_FROM_POPUP') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) return;
      chrome.tabs.sendMessage(tab.id, { type: 'PRISM_TOGGLE' }).catch(() => {});
    });
  }
  return false;
});
