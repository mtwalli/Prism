/* popup/popup.js */
'use strict';

async function init() {
  const manifest = chrome.runtime.getManifest();
  document.getElementById('popup-version').textContent = 'v' + manifest.version;

  // Load theme preference
  const { prism_theme } = await chrome.storage.sync.get('prism_theme').catch(() => ({}));
  const currentTheme = prism_theme || 'auto';
  setActiveThemeBtn(currentTheme);

  // Get active tab stats
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // Check if formatter is active
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'PRISM_GET_STATS' });
    if (response && response.stats) {
      updateStats(response.stats);
      document.getElementById('popup-badge').textContent = 'active';
      document.getElementById('popup-badge').classList.add('active');
      document.getElementById('btn-toggle').textContent = 'Toggle formatter';
    }
  } catch (_) {
    // Tab doesn't have the content script or isn't a JSON page
  }

  // Activate / toggle button
  document.getElementById('btn-toggle').addEventListener('click', async () => {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'PRISM_TOGGLE' });
    } catch (_) {
      // Try injecting content script manually
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/detector.js'],
      }).catch(() => {});
    }
    window.close();
  });

  // Theme buttons
  document.querySelectorAll('.popup-theme-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const theme = btn.dataset.theme;
      setActiveThemeBtn(theme);
      if (theme === 'auto') {
        await chrome.storage.sync.remove('prism_theme').catch(() => {});
      } else {
        await chrome.storage.sync.set({ prism_theme: theme }).catch(() => {});
      }
      // Notify active tab if formatter is running
      chrome.tabs.sendMessage(tab.id, { type: 'PRISM_SET_THEME', theme }).catch(() => {});
    });
  });

  // Options link
  document.getElementById('btn-options').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

function setActiveThemeBtn(theme) {
  document.querySelectorAll('.popup-theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function updateStats(stats) {
  if (!stats) return;
  document.getElementById('stat-keys').textContent = stats.keys?.toLocaleString() + ' keys';
  document.getElementById('stat-depth').textContent = 'depth ' + stats.maxDepth;
  const b = stats.bytes;
  const size = b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  document.getElementById('stat-size').textContent = size;
}

init();
