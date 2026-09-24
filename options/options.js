/* options/options.js */
'use strict';

const DEFAULTS = {
  prism_theme: 'auto',
  prism_show_lines: true,
  prism_show_pathbar: true,
  prism_collapse_depth: 3,
  prism_sort_keys: false,
};

async function load() {
  const prefs = await chrome.storage.sync.get(DEFAULTS).catch(() => ({ ...DEFAULTS }));
  document.getElementById('opt-theme').value = prefs.prism_theme || 'auto';
  document.getElementById('opt-lines').checked = prefs.prism_show_lines !== false;
  document.getElementById('opt-pathbar').checked = prefs.prism_show_pathbar !== false;
  document.getElementById('opt-depth').value = prefs.prism_collapse_depth ?? 3;
  document.getElementById('opt-sort').checked = !!prefs.prism_sort_keys;
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const prefs = {
    prism_theme: document.getElementById('opt-theme').value,
    prism_show_lines: document.getElementById('opt-lines').checked,
    prism_show_pathbar: document.getElementById('opt-pathbar').checked,
    prism_collapse_depth: parseInt(document.getElementById('opt-depth').value, 10) || 3,
    prism_sort_keys: document.getElementById('opt-sort').checked,
  };
  await chrome.storage.sync.set(prefs).catch(() => {});
  const msg = document.getElementById('saved-msg');
  msg.classList.add('show');
  setTimeout(() => msg.classList.remove('show'), 2000);
});

load();
