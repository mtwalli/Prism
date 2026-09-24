/* content/formatter.js — entry point, wires modules together */
(function () {
  'use strict';

  function run() {
    const rawText = window.__prismRawText;
    const parseErrorMsg = window.__prismParseError;
    if (!rawText) return;
    main(rawText, parseErrorMsg);
  }

  if (window.__prismLoaded && window.__prismRawText) {
    run();
  } else {
    window.addEventListener('prism-data-ready', run, { once: true });
  }

  function main(rawText, parseErrorMsg) {

  // ── Parse ──────────────────────────────────────────────────────────────────
  let parsedData = null;
  let parseError = parseErrorMsg;

  if (!parseError) {
    try {
      parsedData = JSON.parse(rawText);
    } catch (err) {
      parseError = err.message;
    }
  }

  // ── Shared state (modules read/write via window.Prism.state) ──────────────
  window.Prism.state = {
    searchIndexCache: [],
    searchMatches: [],
    searchIndex: 0,
  };

  let sortKeys = false;
  let currentTheme = 'dark';
  let isRawView = false;
  let isVisible = true;

  // ── Stats ──────────────────────────────────────────────────────────────────
  function computeStats(data) {
    let keys = 0, maxDepth = 0;
    function walk(node, depth) {
      if (depth > maxDepth) maxDepth = depth;
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        for (const k of Object.keys(node)) { keys++; walk(node[k], depth + 1); }
      } else if (Array.isArray(node)) {
        for (const item of node) walk(item, depth + 1);
      }
    }
    walk(data, 0);
    return { keys, maxDepth, bytes: new Blob([rawText]).size };
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  // ── Theme persistence ──────────────────────────────────────────────────────
  async function loadTheme() {
    try {
      const result = await chrome.storage.sync.get('prism_theme');
      if (result.prism_theme) return result.prism_theme;
    } catch (_) {}
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  async function saveTheme(theme) {
    try { await chrome.storage.sync.set({ prism_theme: theme }); } catch (_) {}
  }

  // ── Clipboard & Download ───────────────────────────────────────────────────
  window.Prism.copyToClipboard = function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => window.Prism.showToast('Copied!')).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      window.Prism.showToast('Copied!');
    });
  };

  let toastTimer = null;
  window.Prism.showToast = function showToast(msg) {
    const toast = document.getElementById('prism-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('prism-toast-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('prism-toast-show'), 1800);
  };

  function downloadJson() {
    const blob = new Blob([rawText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = location.pathname.split('/').filter(Boolean).pop() || 'data';
    a.download = name.endsWith('.json') ? name : name + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  async function init() {
    currentTheme = await loadTheme();

    let stats = null;
    if (parsedData !== null) {
      stats = computeStats(parsedData);
      window.__prismStats = stats;
    }

    const ui = window.Prism.buildShell(stats, currentTheme, formatBytes, parseError, window.Prism.buildSchemaPanel);
    document.body.appendChild(ui.root);

    ui.root.className = `prism-root prism-theme-${currentTheme}`;
    window.Prism.updateThemeIcon(ui.themeBtn, currentTheme);

    // Set raw pre content
    ui.rawPre.textContent = rawText;

    if (parseError) {
      window.Prism.renderError(ui.treeEl, parseError, rawText);
    } else {
      window.Prism.renderTree(parsedData, ui.treeEl, { sortKeys });
      window.Prism.initPathBar(ui.treeEl, ui.pathBar);
    }

    // ── Event Handlers ─────────────────────────────────────────────────────

    // Search
    ui.searchInput.addEventListener('input', () => {
      window.Prism.onSearchInput(ui.searchInput.value, ui.treeEl, ui.searchCount);
    });
    ui.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.Prism.navigateSearch(e.shiftKey ? -1 : 1, ui.searchCount);
      }
      if (e.key === 'Escape') {
        ui.searchInput.value = '';
        window.Prism.onSearchInput('', ui.treeEl, ui.searchCount);
      }
    });
    ui.prevBtn.addEventListener('click', () => window.Prism.navigateSearch(-1, ui.searchCount));
    ui.nextBtn.addEventListener('click', () => window.Prism.navigateSearch(1, ui.searchCount));

    // Collapse all / Expand all
    ui.collapseAllBtn.addEventListener('click', () => window.Prism.collapseAll(ui.treeEl));
    ui.expandAllBtn.addEventListener('click', () => window.Prism.expandAll(ui.treeEl));

    // Raw toggle
    ui.rawBtn.addEventListener('click', () => {
      isRawView = !isRawView;
      const label = ui.rawBtn.querySelector('.prism-btn-label');
      const treeWrap = document.getElementById('prism-tree-wrap');
      if (isRawView) {
        treeWrap.style.display = 'none';
        ui.rawView.classList.add('prism-visible');
        ui.rawBtn.classList.add('prism-active');
        if (label) label.textContent = 'Formatted';
      } else {
        treeWrap.style.display = '';
        ui.rawView.classList.remove('prism-visible');
        ui.rawBtn.classList.remove('prism-active');
        if (label) label.textContent = 'Raw';
      }
    });

    // Sort keys
    ui.sortBtn.addEventListener('click', () => {
      if (parseError) return;
      sortKeys = !sortKeys;
      ui.sortBtn.classList.toggle('prism-active', sortKeys);
      window.Prism.renderTree(parsedData, ui.treeEl, { sortKeys });
      window.Prism.initPathBar(ui.treeEl, ui.pathBar);
      if (ui.searchInput.value) window.Prism.applySearch(ui.searchInput.value, ui.treeEl, ui.searchCount);
    });

    // Copy all
    ui.copyBtn.addEventListener('click', () => window.Prism.copyToClipboard(rawText));

    // Download
    ui.dlBtn.addEventListener('click', downloadJson);

    // Schema panel toggle
    ui.schemaBtn.addEventListener('click', () => {
      const overlay = document.getElementById('prism-schema-panel');
      if (!overlay) return;
      const isOpen = !overlay.classList.contains('prism-hidden');
      overlay.classList.toggle('prism-hidden', isOpen);
      ui.schemaBtn.classList.toggle('prism-active', !isOpen);
      if (!isOpen) {
        const ta = document.getElementById('prism-schema-textarea');
        if (ta) setTimeout(() => ta.focus(), 60);
      }
    });

    document.getElementById('prism-schema-panel')?.querySelector('.prism-schema-close')
      ?.addEventListener('click', () => {
        document.getElementById('prism-schema-panel')?.classList.add('prism-hidden');
        ui.schemaBtn.classList.remove('prism-active');
      });

    document.getElementById('prism-schema-panel')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('prism-schema-panel')) {
        document.getElementById('prism-schema-panel').classList.add('prism-hidden');
        ui.schemaBtn.classList.remove('prism-active');
      }
    });

    document.getElementById('prism-validate-btn')?.addEventListener('click', () => {
      const ta = document.getElementById('prism-schema-textarea');
      if (ta) {
        window.Prism.validateSchema(ta.value, ui.treeEl, parsedData);
        document.getElementById('prism-schema-results-wrap')?.classList.remove('prism-hidden');
      }
    });

    document.getElementById('prism-schema-clear-btn')?.addEventListener('click', () => {
      ui.treeEl.querySelectorAll('.prism-schema-error').forEach(el => el.classList.remove('prism-schema-error'));
      const r = document.getElementById('prism-schema-results');
      if (r) r.innerHTML = '';
      document.getElementById('prism-schema-results-wrap')?.classList.add('prism-hidden');
    });

    // Theme toggle
    ui.themeBtn.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      ui.root.className = `prism-root prism-theme-${currentTheme}`;
      window.Prism.updateThemeIcon(ui.themeBtn, currentTheme);
      saveTheme(currentTheme);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const mac = (navigator.userAgentData?.platform || navigator.platform).toUpperCase().includes('MAC');
      const mod = mac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === 'f') { e.preventDefault(); ui.searchInput.focus(); ui.searchInput.select(); }
      if (mod && e.key === 'k') { e.preventDefault(); window.Prism.copyToClipboard(rawText); }
      if (mod && e.key === '\\') { e.preventDefault(); ui.rawBtn.click(); }
      if (e.key === 'Escape') {
        const overlay = document.getElementById('prism-schema-panel');
        if (overlay && !overlay.classList.contains('prism-hidden')) {
          overlay.classList.add('prism-hidden');
          ui.schemaBtn.classList.remove('prism-active');
        }
      }
    });

    // Toggle visibility from popup
    window.addEventListener('prism-toggle', () => {
      isVisible = !isVisible;
      ui.root.style.display = isVisible ? '' : 'none';
    });

    // Theme change from popup
    window.addEventListener('prism-set-theme', (e) => {
      const theme = e.detail;
      currentTheme = theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : theme;
      ui.root.className = `prism-root prism-theme-${currentTheme}`;
      window.Prism.updateThemeIcon(ui.themeBtn, currentTheme);
    });
  }

  init();
  } // end main()
})();
