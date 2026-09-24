/* background/service-worker.js */
'use strict';

// Badge is set by the content script (detector.js) once it confirms JSON
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PRISM_JSON_DETECTED' && sender.tab?.id) {
    const tabId = sender.tab.id;
    chrome.storage.session.set({ [`tab_${tabId}_isJson`]: true }).catch(() => {});
    chrome.action.setBadgeText({ text: '{}', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#89b4fa', tabId });
    chrome.action.setBadgeTextColor({ color: '#1e1e2e', tabId });
  }

  if (msg.type === 'PRISM_TOGGLE_FROM_POPUP') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) return;
      chrome.tabs.sendMessage(tab.id, { type: 'PRISM_TOGGLE' }).catch(() => {});
    });
  }

  return false;
});

// Clean up badge and session flag on tab close / navigation
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`tab_${tabId}_isJson`).catch(() => {});
  chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.storage.session.remove(`tab_${tabId}_isJson`).catch(() => {});
    chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
  }
});
