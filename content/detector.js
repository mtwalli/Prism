/* content/detector.js — injected at document_start on all URLs */
(function () {
  'use strict';

  if (window !== window.top) return;
  if (window.__prismLoaded) return;

  function waitForBody() {
    return new Promise(resolve => {
      if (document.body) { resolve(); return; }
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  function getRawText() {
    // After our DNR rule rewrites content-type to text/plain, Chrome renders
    // the raw text directly in <body> (no <pre> wrapper).
    // Fallback: Chrome's built-in viewer wraps in <body><pre>...</pre></body>
    const pre = document.body && document.body.querySelector('pre');
    if (pre) return pre.textContent || '';
    return (document.body && document.body.innerText) || '';
  }

  function injectFormatter(rawText, parseError) {
    if (window.__prismLoaded) return;
    window.__prismLoaded = true;
    window.__prismRawText = rawText;
    window.__prismParseError = parseError || null;

    // Inject CSS so the page goes dark immediately
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('styles/formatter.css');
    document.head.appendChild(link);

    // Signal formatter.js (declared content script) that data is ready
    window.dispatchEvent(new CustomEvent('prism-data-ready'));
  }

  async function detect() {
    await waitForBody();

    const raw = getRawText();
    if (!raw) return;

    const trimmed = raw.trim();

    // Quick pre-check: JSON must start with { [ " t f n or a digit
    if (!/^[\{\["tfn\d\-]/.test(trimmed)) return;

    let parseError = null;
    try {
      JSON.parse(trimmed);
    } catch (err) {
      parseError = err.message;
      // Only show error display if service worker flagged this as a JSON URL
      const result = await chrome.storage.session.get(null).catch(() => ({}));
      const wasJson = Object.keys(result).some(k => k.endsWith('_isJson'));
      if (!wasJson) return;
    }

    injectFormatter(trimmed, parseError);
    chrome.runtime.sendMessage({ type: 'PRISM_JSON_DETECTED' }).catch(() => {});
  }

  // Listen for messages from popup/service worker
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'PRISM_TOGGLE') {
      if (window.__prismLoaded) {
        window.dispatchEvent(new CustomEvent('prism-toggle'));
      } else {
        detect();
      }
    }
    if (msg.type === 'PRISM_GET_STATS') {
      sendResponse({ stats: window.__prismStats || null });
      return true;
    }
    if (msg.type === 'PRISM_SET_THEME') {
      window.dispatchEvent(new CustomEvent('prism-set-theme', { detail: msg.theme }));
    }
  });

  detect();
})();
