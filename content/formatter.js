/* content/formatter.js — declared content script, runs after detector.js signals */
(function () {
  'use strict';

  function run() {
    const rawText = window.__prismRawText;
    const parseErrorMsg = window.__prismParseError;
    if (!rawText) return;
    main(rawText, parseErrorMsg);
  }

  // detector.js fires 'prism-data-ready' when it has captured the JSON text.
  // If it already fired before we loaded (unlikely but possible), the flag is set.
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

  // ── State ──────────────────────────────────────────────────────────────────
  let sortKeys = false;
  let currentTheme = 'dark';
  let searchMatches = [];
  let searchIndex = 0;
  let isRawView = false;
  let isVisible = true;
  let searchIndexCache = [];

  // ── Stats ──────────────────────────────────────────────────────────────────
  function computeStats(data) {
    let keys = 0, maxDepth = 0;
    function walk(node, depth) {
      if (depth > maxDepth) maxDepth = depth;
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        for (const k of Object.keys(node)) {
          keys++;
          walk(node[k], depth + 1);
        }
      } else if (Array.isArray(node)) {
        for (const item of node) walk(item, depth + 1);
      }
    }
    walk(data, 0);
    const bytes = new Blob([rawText]).size;
    return { keys, maxDepth, bytes };
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  // ── Theme ──────────────────────────────────────────────────────────────────
  async function loadTheme() {
    try {
      const result = await chrome.storage.sync.get('prism_theme');
      if (result.prism_theme) return result.prism_theme;
    } catch (_) {}
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  async function saveTheme(theme) {
    try {
      await chrome.storage.sync.set({ prism_theme: theme });
    } catch (_) {}
  }

  // ── SVG Icons ──────────────────────────────────────────────────────────────
  const ICONS = {
    copy:        `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
    download:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5v-2z"/></svg>`,
    schema:      `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
    sort:        `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h6v-2H3v2zm0-5h12v-2H3v2zm0-7v2h18V6H3z"/></svg>`,
    sun:         `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .38-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.38.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.03 0-1.41-.38-.39-1.03-.39-1.41 0zM7.05 18.36l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41-.39-.38-1.03-.39-1.41 0z"/></svg>`,
    moon:        `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>`,
    check:       `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
    error:       `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
    triangle:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 17l5-5-5-5v10z"/></svg>`,
    search:      `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
    arrow_up:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>`,
    arrow_down:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`,
    code:        `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
  };

  function icon(name) {
    const span = document.createElement('span');
    span.innerHTML = ICONS[name] || '';
    span.style.cssText = 'display:inline-flex;align-items:center;pointer-events:none';
    return span;
  }

  // ── Build UI Shell ─────────────────────────────────────────────────────────
  function buildShell(stats) {
    const root = document.createElement('div');
    root.id = 'prism-root';
    root.className = `prism-root prism-theme-${currentTheme}`;

    // Header / App Bar
    const header = document.createElement('div');
    header.className = 'prism-header';

    // Logo — diamond icon + wordmark
    const logo = document.createElement('div');
    logo.className = 'prism-logo';
    logo.innerHTML = '<svg class="prism-logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L22 9L12 22L2 9Z" fill="currentColor"/></svg><span class="prism-logo-word">Prism</span>';

    // Stats — plain inline text (no chip)
    const headerDiv = document.createElement('div');
    headerDiv.className = 'prism-header-div';

    const statsEl = document.createElement('div');
    statsEl.className = 'prism-stats';
    if (stats && !parseError) {
      statsEl.innerHTML =
        `<span>${stats.keys.toLocaleString()} keys</span>` +
        `<span class="prism-stats-sep">·</span>` +
        `<span>depth ${stats.maxDepth}</span>` +
        `<span class="prism-stats-sep">·</span>` +
        `<span>${formatBytes(stats.bytes)}</span>`;
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'prism-toolbar';

    // ── MD3 Search field with leading icon ──────────────────────────────
    const searchWrap = document.createElement('div');
    searchWrap.className = 'prism-search-wrap';

    // Icon as inline SVG label — no absolute positioning needed
    const searchIconEl = document.createElement('span');
    searchIconEl.className = 'prism-search-icon';
    searchIconEl.setAttribute('aria-hidden', 'true');
    searchIconEl.innerHTML = ICONS.search;
    // Force explicit size on the SVG element itself
    const searchSvg = searchIconEl.querySelector('svg');
    if (searchSvg) { searchSvg.setAttribute('width', '14'); searchSvg.setAttribute('height', '14'); }

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'prism-search';
    searchInput.placeholder = 'Search…';
    searchInput.setAttribute('aria-label', 'Search JSON');

    searchWrap.appendChild(searchIconEl);
    searchWrap.appendChild(searchInput);

    // Count badge — standalone, shown only when there are results
    const searchCount = document.createElement('span');
    searchCount.className = 'prism-search-count';

    // Navigation icon buttons
    const searchNav = document.createElement('div');
    searchNav.className = 'prism-search-nav';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'prism-search-nav-btn';
    prevBtn.title = 'Previous match (Shift+Enter)';
    prevBtn.innerHTML = ICONS.arrow_up;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'prism-search-nav-btn';
    nextBtn.title = 'Next match (Enter)';
    nextBtn.innerHTML = ICONS.arrow_down;

    searchNav.appendChild(prevBtn);
    searchNav.appendChild(nextBtn);

    // ── Toolbar buttons ──────────────────────────────────────────────────
    const rawBtn    = makeBtn('Raw',    ICONS.code,     'prism-raw-btn',      'Toggle raw/formatted view (Ctrl+\\)');
    const sortBtn   = makeBtn('Sort',   ICONS.sort,     'prism-sort-btn',     'Sort object keys alphabetically');
    const copyBtn   = makeBtn('Copy',   ICONS.copy,     'prism-copy-btn-all', 'Copy JSON (Ctrl+K)');
    const dlBtn     = makeBtn('Save',   ICONS.download, 'prism-dl-btn',       'Download as .json');
    const schemaBtn = makeBtn('Schema', ICONS.schema,   'prism-schema-btn',   'Validate against JSON Schema');
    const themeBtn  = makeBtn('',       null,           'prism-theme-btn',    'Toggle theme');
    themeBtn.classList.add('prism-btn-icon');

    const sep1 = makeSep();
    const sep2 = makeSep();
    const sep3 = makeSep();

    [searchWrap, searchCount, searchNav, sep1, rawBtn, sortBtn, sep2, copyBtn, dlBtn, sep3, schemaBtn, themeBtn]
      .forEach(el => toolbar.appendChild(el));
    [logo, headerDiv, statsEl, toolbar].forEach(el => header.appendChild(el));

    // Schema panel
    const schemaPanel = buildSchemaPanel();

    // Main area
    const main = document.createElement('div');
    main.className = 'prism-main';

    const treeWrap = document.createElement('div');
    treeWrap.className = 'prism-tree-wrap';
    treeWrap.id = 'prism-tree-wrap';

    const treeEl = document.createElement('div');
    treeEl.className = 'prism-tree';
    treeEl.id = 'prism-tree';
    treeWrap.appendChild(treeEl);

    const rawView = document.createElement('div');
    rawView.className = 'prism-raw-view';
    rawView.id = 'prism-raw-view';
    const rawPre = document.createElement('pre');
    rawPre.className = 'prism-raw-pre';
    rawPre.textContent = rawText;
    rawView.appendChild(rawPre);

    main.appendChild(treeWrap);
    main.appendChild(rawView);

    // Path bar
    const pathBar = document.createElement('div');
    pathBar.className = 'prism-path-bar';
    pathBar.id = 'prism-path-bar';
    pathBar.textContent = '$';

    // Toast
    const toast = document.createElement('div');
    toast.className = 'prism-toast';
    toast.id = 'prism-toast';

    // schemaPanel is an absolute overlay — append last so it sits on top of everything
    [header, main, pathBar, toast, schemaPanel].forEach(el => root.appendChild(el));

    return {
      root, treeEl, rawView, pathBar, toast,
      searchInput, searchCount, prevBtn, nextBtn,
      rawBtn, sortBtn, copyBtn: copyBtn, dlBtn, schemaBtn, themeBtn,
    };
  }

  function makeBtn(label, svgStr, id, title) {
    const btn = document.createElement('button');
    btn.id = id;
    if (title) btn.title = title;
    if (svgStr) {
      btn.className = 'prism-btn';
      const span = document.createElement('span');
      span.className = 'prism-btn-icon-wrap';
      span.innerHTML = svgStr;
      btn.appendChild(span);
    } else {
      btn.className = 'prism-btn prism-btn-no-icon';
    }
    if (label) {
      const text = document.createElement('span');
      text.className = 'prism-btn-label';
      text.textContent = label;
      btn.appendChild(text);
    }
    return btn;
  }

  function makeSep() {
    const s = document.createElement('div');
    s.className = 'prism-toolbar-sep';
    return s;
  }

  function buildSchemaPanel() {
    // Overlay backdrop
    const overlay = document.createElement('div');
    overlay.className = 'prism-schema-overlay prism-hidden';
    overlay.id = 'prism-schema-panel';

    // Dialog card
    const dialog = document.createElement('div');
    dialog.className = 'prism-schema-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'prism-schema-title');

    // ── Title bar (drag handle) ──────────────────────────────────────────
    const titleBar = document.createElement('div');
    titleBar.className = 'prism-schema-titlebar';

    const titleIcon = document.createElement('span');
    titleIcon.className = 'prism-schema-title-icon';
    titleIcon.innerHTML = ICONS.schema;

    const titleText = document.createElement('span');
    titleText.className = 'prism-schema-title-text';
    titleText.id = 'prism-schema-title';
    titleText.textContent = 'Schema Validator';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'prism-schema-close';
    closeBtn.title = 'Close';
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

    titleBar.appendChild(titleIcon);
    titleBar.appendChild(titleText);
    titleBar.appendChild(closeBtn);

    // ── Body ─────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'prism-schema-body';

    // Textarea section
    const fieldWrap = document.createElement('div');
    fieldWrap.className = 'prism-schema-field-wrap';

    const fieldLabel = document.createElement('label');
    fieldLabel.className = 'prism-schema-field-label';
    fieldLabel.textContent = 'JSON Schema (Draft-07)';
    fieldLabel.htmlFor = 'prism-schema-textarea';

    const textarea = document.createElement('textarea');
    textarea.className = 'prism-schema-textarea';
    textarea.placeholder = 'Paste your JSON Schema here…\n\nExample:\n{\n  "type": "object",\n  "required": ["id"],\n  "properties": {\n    "id": { "type": "integer" }\n  }\n}';
    textarea.id = 'prism-schema-textarea';
    textarea.spellcheck = false;

    fieldWrap.appendChild(fieldLabel);
    fieldWrap.appendChild(textarea);

    // Action row
    const actions = document.createElement('div');
    actions.className = 'prism-schema-actions';

    const validateBtn = makeBtn('Validate', ICONS.check, 'prism-validate-btn', 'Validate JSON against schema');
    const clearBtn    = makeBtn('Clear errors', null, 'prism-schema-clear-btn', 'Clear schema error highlights');
    validateBtn.classList.add('prism-btn-filled', 'prism-btn-labeled');
    clearBtn.classList.add('prism-btn-labeled');
    actions.appendChild(validateBtn);
    actions.appendChild(clearBtn);

    // Results section
    const resultsWrap = document.createElement('div');
    resultsWrap.className = 'prism-schema-results-wrap prism-hidden';
    resultsWrap.id = 'prism-schema-results-wrap';

    const resultsDivider = document.createElement('div');
    resultsDivider.className = 'prism-schema-divider';

    const resultsHeader = document.createElement('div');
    resultsHeader.className = 'prism-schema-results-header';
    const resultsTitle = document.createElement('span');
    resultsTitle.textContent = 'Validation Results';
    resultsHeader.appendChild(resultsTitle);

    const results = document.createElement('div');
    results.className = 'prism-schema-results';
    results.id = 'prism-schema-results';

    resultsWrap.appendChild(resultsDivider);
    resultsWrap.appendChild(resultsHeader);
    resultsWrap.appendChild(results);

    body.appendChild(fieldWrap);
    body.appendChild(actions);
    body.appendChild(resultsWrap);

    // ── Resize handle ────────────────────────────────────────────────────
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'prism-schema-resize';
    resizeHandle.title = 'Drag to resize';
    resizeHandle.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M11 5h2v2h-2zm0 4h2v2h-2zM7 9h2v2H7zm4 4h2v2h-2zM7 13h2v2H7zM3 13h2v2H3z"/></svg>`;

    dialog.appendChild(titleBar);
    dialog.appendChild(body);
    dialog.appendChild(resizeHandle);
    overlay.appendChild(dialog);

    // ── Drag logic ───────────────────────────────────────────────────────
    let dragState = null;
    titleBar.addEventListener('mousedown', (e) => {
      if (e.target === closeBtn || closeBtn.contains(e.target)) return;
      e.preventDefault();
      const rect = dialog.getBoundingClientRect();
      dragState = { startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top };
      dialog.classList.add('prism-schema-dragging');
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const root = document.getElementById('prism-root');
      const rRect = root ? root.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
      const dRect = dialog.getBoundingClientRect();
      const newLeft = Math.max(rRect.left, Math.min(dragState.origLeft + dx, rRect.right - dRect.width));
      const newTop  = Math.max(rRect.top,  Math.min(dragState.origTop  + dy, rRect.bottom - dRect.height));
      dialog.style.left = newLeft + 'px';
      dialog.style.top  = newTop  + 'px';
      dialog.style.right  = 'auto';
      dialog.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => {
      if (dragState) { dragState = null; dialog.classList.remove('prism-schema-dragging'); }
    });

    // ── Resize logic ─────────────────────────────────────────────────────
    let resizeState = null;
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const rect = dialog.getBoundingClientRect();
      resizeState = { startX: e.clientX, startY: e.clientY, origW: rect.width, origH: rect.height };
    });
    document.addEventListener('mousemove', (e) => {
      if (!resizeState) return;
      const dx = e.clientX - resizeState.startX;
      const dy = e.clientY - resizeState.startY;
      dialog.style.width  = Math.max(340, resizeState.origW + dx) + 'px';
      dialog.style.height = Math.max(200, resizeState.origH + dy) + 'px';
    });
    document.addEventListener('mouseup', () => { resizeState = null; });

    return overlay;
  }

  // ── Tree Renderer ──────────────────────────────────────────────────────────
  function renderTree(data, treeEl, opts = {}) {
    treeEl.innerHTML = '';
    searchIndexCache = [];
    renderValue(data, null, '$', 0, treeEl, opts, true);
  }

  function renderValue(value, key, path, depth, parentEl, opts, isLast) {
    const type = getType(value);
    const nodeEl = document.createElement('div');
    nodeEl.className = 'prism-node';
    nodeEl.dataset.path = path;
    nodeEl.dataset.type = type;

    if (type === 'object' || type === 'array') {
      renderCollapsible(value, key, path, depth, nodeEl, opts, isLast);
    } else {
      renderScalar(value, key, path, type, depth, nodeEl, isLast);
    }

    parentEl.appendChild(nodeEl);
  }

  function renderCollapsible(value, key, path, depth, nodeEl, opts, isLast) {
    const isArray = Array.isArray(value);
    const entries = isArray ? value : getSortedEntries(value, opts.sortKeys);
    const count = entries.length;
    const openBracket = isArray ? '[' : '{';
    const closeBracket = isArray ? ']' : '}';
    const autoCollapse = depth >= 3;

    if (autoCollapse) nodeEl.classList.add('prism-collapsed');

    // Header line
    const header = document.createElement('div');
    header.className = 'prism-node-header';

    const toggle = document.createElement('button');
    toggle.className = 'prism-toggle';
    toggle.setAttribute('aria-label', 'Toggle');
    toggle.innerHTML = ICONS.triangle;

    if (key !== null) {
      header.appendChild(makeKey(key));
      header.appendChild(makeColon());
    }
    header.appendChild(toggle);
    header.appendChild(makeBracket(openBracket));

    const summary = document.createElement('span');
    summary.className = 'prism-summary';
    summary.textContent = isArray
      ? `${count} item${count !== 1 ? 's' : ''}`
      : `${count} key${count !== 1 ? 's' : ''}`;
    header.appendChild(summary);

    const inlineBracketClose = document.createElement('span');
    inlineBracketClose.className = 'prism-bracket-inline-close';
    inlineBracketClose.textContent = closeBracket + (isLast ? '' : ',');
    header.appendChild(inlineBracketClose);

    // Copy button for objects/arrays
    header.appendChild(makeCopyBtn(() => JSON.stringify(value, null, 2)));

    nodeEl.appendChild(header);

    // Children container
    const childrenEl = document.createElement('div');
    childrenEl.className = 'prism-children';
    if (isArray) {
      value.forEach((item, i) => {
        const childPath = `${path}[${i}]`;
        renderValue(item, null, childPath, depth + 1, childrenEl, opts, i === value.length - 1);
      });
    } else {
      entries.forEach(([k, v], i) => {
        const childPath = `${path}.${/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `["${k}"]`}`;
        renderValue(v, k, childPath, depth + 1, childrenEl, opts, i === entries.length - 1);
      });
    }
    nodeEl.appendChild(childrenEl);

    // Closing bracket on its own line
    const bracketClose = document.createElement('div');
    bracketClose.className = 'prism-bracket-close';
    bracketClose.textContent = closeBracket + (isLast ? '' : ',');
    nodeEl.appendChild(bracketClose);

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      nodeEl.classList.toggle('prism-collapsed');
    });

    // Build search index entry
    searchIndexCache.push({ path, keyText: key ?? '', valueText: '', nodeEl: header });
  }

  function renderScalar(value, key, path, type, depth, nodeEl, isLast) {
    const header = document.createElement('div');
    header.className = 'prism-node-header';

    const placeholder = document.createElement('span');
    placeholder.className = 'prism-toggle-placeholder';
    header.appendChild(placeholder);

    if (key !== null) {
      header.appendChild(makeKey(key));
      header.appendChild(makeColon());
    }

    const valueEl = renderScalarValue(value, type);
    header.appendChild(valueEl);

    const comma = document.createElement('span');
    comma.className = 'prism-comma';
    comma.textContent = isLast ? '' : ',';
    header.appendChild(comma);

    header.appendChild(makeCopyBtn(() => JSON.stringify(value)));

    nodeEl.appendChild(header);

    // Build search index entry
    const rawVal = value === null ? 'null' : String(value);
    searchIndexCache.push({ path, keyText: key ?? '', valueText: rawVal, nodeEl: header, valueEl });
  }

  function renderScalarValue(value, type) {
    const span = document.createElement('span');

    if (type === 'string') {
      span.className = 'prism-value-string';
      // Check if value looks like a URL
      if (/^https?:\/\//.test(value)) {
        span.className = 'prism-value-url';
        span.textContent = `"${value}"`;
        span.title = 'Click to open URL';
        span.addEventListener('click', () => window.open(value, '_blank', 'noopener'));
      } else {
        span.textContent = `"${value}"`;
      }
    } else if (type === 'number') {
      span.className = 'prism-value-number';
      span.textContent = String(value);
    } else if (type === 'boolean') {
      span.className = 'prism-value-boolean';
      span.textContent = String(value);
    } else if (type === 'null') {
      span.className = 'prism-value-null';
      span.textContent = 'null';
    }

    return span;
  }

  function makeKey(key) {
    const span = document.createElement('span');
    span.className = 'prism-key';
    span.textContent = `"${key}"`;
    return span;
  }

  function makeColon() {
    const span = document.createElement('span');
    span.className = 'prism-colon';
    span.textContent = ': ';
    return span;
  }

  function makeBracket(char) {
    const span = document.createElement('span');
    span.className = 'prism-bracket';
    span.textContent = char;
    return span;
  }

  function makeCopyBtn(getVal) {
    const btn = document.createElement('button');
    btn.className = 'prism-copy-val';
    btn.title = 'Copy value';
    btn.innerHTML = ICONS.copy;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(getVal());
    });
    return btn;
  }

  function getSortedEntries(obj, sort) {
    const entries = Object.entries(obj);
    if (sort) entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }

  function getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  let searchDebounce = null;

  function onSearchInput(query, treeEl, searchCount) {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => applySearch(query, treeEl, searchCount), 200);
  }

  function applySearch(query, treeEl, searchCount) {
    // Clear previous
    treeEl.querySelectorAll('.prism-search-match, .prism-search-current').forEach(el => {
      el.classList.remove('prism-search-match', 'prism-search-current');
    });
    treeEl.querySelectorAll('mark.prism-hl').forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    });
    searchMatches = [];
    searchIndex = 0;

    const q = query.trim().toLowerCase();
    if (!q) {
      searchCount.textContent = '';
      return;
    }

    searchIndexCache.forEach(({ keyText, valueText, nodeEl }) => {
      const keyMatch = keyText.toLowerCase().includes(q);
      const valMatch = valueText.toLowerCase().includes(q);
      if (keyMatch || valMatch) {
        nodeEl.classList.add('prism-search-match');
        searchMatches.push(nodeEl);
        expandAncestors(nodeEl);
        if (keyMatch) highlightText(nodeEl.querySelector('.prism-key'), q);
        if (valMatch) highlightText(nodeEl.querySelector('[class^="prism-value"]'), q);
      }
    });

    searchCount.textContent = searchMatches.length ? `${searchMatches.length}` : '0';

    if (searchMatches.length) {
      searchIndex = 0;
      scrollToMatch(0);
    }
  }

  function navigateSearch(dir, searchCount) {
    if (!searchMatches.length) return;
    searchIndex = (searchIndex + dir + searchMatches.length) % searchMatches.length;
    const label = `${searchIndex + 1}/${searchMatches.length}`;
    searchCount.textContent = label;
    scrollToMatch(searchIndex);
  }

  function scrollToMatch(idx) {
    searchMatches.forEach((el, i) => el.classList.toggle('prism-search-current', i === idx));
    const el = searchMatches[idx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function expandAncestors(el) {
    let parent = el.parentElement;
    while (parent && parent.id !== 'prism-tree') {
      if (parent.classList.contains('prism-node') && parent.classList.contains('prism-collapsed')) {
        parent.classList.remove('prism-collapsed');
      }
      parent = parent.parentElement;
    }
  }

  function highlightText(el, query) {
    if (!el) return;
    const text = el.textContent;
    const lower = text.toLowerCase();
    let result = '';
    let i = 0;
    while (i < text.length) {
      const idx = lower.indexOf(query, i);
      if (idx === -1) { result += escapeHtml(text.slice(i)); break; }
      result += escapeHtml(text.slice(i, idx));
      result += `<mark class="prism-hl">${escapeHtml(text.slice(idx, idx + query.length))}</mark>`;
      i = idx + query.length;
    }
    el.innerHTML = result;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Schema Validation ──────────────────────────────────────────────────────
  function validateSchema(schemaText, treeEl) {
    const results = document.getElementById('prism-schema-results');
    if (!results) return;

    treeEl.querySelectorAll('.prism-schema-error').forEach(el => el.classList.remove('prism-schema-error'));
    results.innerHTML = '';

    if (!window.Ajv) {
      const msg = document.createElement('div');
      msg.className = 'prism-schema-error-item';
      msg.innerHTML = `<span class="prism-schema-err-msg">Validator not loaded.</span>`;
      results.appendChild(msg);
      return;
    }

    let schema;
    try {
      schema = JSON.parse(schemaText.trim());
    } catch (err) {
      const msg = document.createElement('div');
      msg.className = 'prism-schema-error-item';
      msg.innerHTML = `<span class="prism-schema-err-path">Schema parse error</span><span class="prism-schema-err-msg">${escapeHtml(err.message)}</span>`;
      results.appendChild(msg);
      return;
    }

    try {
      const ajv = new window.Ajv({ allErrors: true });
      const validate = ajv.compile(schema);
      const valid = validate(parsedData);

      if (valid) {
        const msg = document.createElement('div');
        msg.className = 'prism-schema-valid-msg';
        msg.innerHTML = ICONS.check + '<span>Valid — data matches the schema</span>';
        results.appendChild(msg);
      } else {
        validate.errors.forEach(err => {
          const item = document.createElement('div');
          item.className = 'prism-schema-error-item';

          const pathSpan = document.createElement('span');
          pathSpan.className = 'prism-schema-err-path';
          pathSpan.textContent = err.instancePath || '/';

          const msgSpan = document.createElement('span');
          msgSpan.className = 'prism-schema-err-msg';
          msgSpan.textContent = err.message;

          item.appendChild(pathSpan);
          item.appendChild(msgSpan);
          results.appendChild(item);

          const jexPath = jsonPointerToPath(err.instancePath);
          const node = treeEl.querySelector(`[data-path="${CSS.escape(jexPath)}"]`);
          if (node) {
            const header = node.querySelector('.prism-node-header');
            if (header) header.classList.add('prism-schema-error');
            expandAncestors(node);
          }
        });
      }
    } catch (err) {
      const msg = document.createElement('div');
      msg.className = 'prism-schema-error-item';
      msg.innerHTML = `<span class="prism-schema-err-path">Validation error</span><span class="prism-schema-err-msg">${escapeHtml(err.message)}</span>`;
      results.appendChild(msg);
    }
  }

  function jsonPointerToPath(pointer) {
    if (!pointer) return '$';
    return '$' + pointer.split('/').slice(1).map(seg => {
      const decoded = seg.replace(/~1/g, '/').replace(/~0/g, '~');
      return /^\d+$/.test(decoded) ? `[${decoded}]` : `.${decoded}`;
    }).join('');
  }

  // ── Clipboard & Download ───────────────────────────────────────────────────
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied!')).catch(() => {
      // Fallback for restricted pages
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied!');
    });
  }

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

  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById('prism-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('prism-toast-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('prism-toast-show'), 1800);
  }

  // ── Error Display ──────────────────────────────────────────────────────────
  function renderError(treeEl) {
    const card = document.createElement('div');
    card.className = 'prism-error-card';

    const header = document.createElement('div');
    header.className = 'prism-error-card-header';
    header.innerHTML = ICONS.error + ' JSON Parse Error';

    const body = document.createElement('div');
    body.className = 'prism-error-card-body';

    const msg = document.createElement('div');
    msg.className = 'prism-error-msg';
    msg.textContent = parseError;
    body.appendChild(msg);

    // Try to highlight error position
    const posMatch = parseError && parseError.match(/position (\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const pre = document.createElement('pre');
      pre.className = 'prism-error-pre';
      const before = rawText.slice(Math.max(0, pos - 40), pos);
      const at = rawText.slice(pos, pos + 1);
      const after = rawText.slice(pos + 1, pos + 40);
      pre.appendChild(document.createTextNode('…' + before));
      const mark = document.createElement('mark');
      mark.className = 'prism-error-highlight';
      mark.textContent = at || '↵';
      pre.appendChild(mark);
      pre.appendChild(document.createTextNode(after + '…'));
      body.appendChild(pre);
    }

    card.appendChild(header);
    card.appendChild(body);
    treeEl.appendChild(card);
  }

  // ── Path Bar ───────────────────────────────────────────────────────────────
  function initPathBar(treeEl, pathBar) {
    treeEl.addEventListener('mouseover', (e) => {
      const node = e.target.closest('[data-path]');
      if (node) pathBar.textContent = node.dataset.path;
    });
    treeEl.addEventListener('mouseleave', () => {
      pathBar.textContent = '$';
    });
  }

  // ── Main Init ──────────────────────────────────────────────────────────────
  async function init() {
    // Load preferences
    currentTheme = await loadTheme();

    let stats = null;
    if (parsedData !== null) {
      stats = computeStats(parsedData);
      window.__prismStats = stats;
    }

    const ui = buildShell(stats);
    document.body.appendChild(ui.root);

    // Apply theme
    ui.root.className = `prism-root prism-theme-${currentTheme}`;
    updateThemeIcon(ui.themeBtn, currentTheme);

    // Render tree or error
    if (parseError) {
      renderError(ui.treeEl);
    } else {
      renderTree(parsedData, ui.treeEl, { sortKeys });
      initPathBar(ui.treeEl, ui.pathBar);
    }

    // ── Event Handlers ────────────────────────────────────────────────
    // Search
    ui.searchInput.addEventListener('input', () => {
      onSearchInput(ui.searchInput.value, ui.treeEl, ui.searchCount);
    });
    ui.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        navigateSearch(e.shiftKey ? -1 : 1, ui.searchCount);
      }
      if (e.key === 'Escape') {
        ui.searchInput.value = '';
        onSearchInput('', ui.treeEl, ui.searchCount);
      }
    });
    ui.prevBtn.addEventListener('click', () => navigateSearch(-1, ui.searchCount));
    ui.nextBtn.addEventListener('click', () => navigateSearch(1, ui.searchCount));

    // Raw toggle
    function updateRawBtn() {
      const label = ui.rawBtn.querySelector('.prism-btn-label');
      if (isRawView) {
        document.getElementById('prism-tree-wrap').style.display = 'none';
        ui.rawView.classList.add('prism-visible');
        ui.rawBtn.classList.add('prism-active');
        if (label) label.textContent = 'Formatted';
      } else {
        document.getElementById('prism-tree-wrap').style.display = '';
        ui.rawView.classList.remove('prism-visible');
        ui.rawBtn.classList.remove('prism-active');
        if (label) label.textContent = 'Raw';
      }
    }
    ui.rawBtn.addEventListener('click', () => {
      isRawView = !isRawView;
      updateRawBtn();
    });

    // Sort keys
    ui.sortBtn.addEventListener('click', () => {
      if (parseError) return;
      sortKeys = !sortKeys;
      ui.sortBtn.classList.toggle('prism-active', sortKeys);
      renderTree(parsedData, ui.treeEl, { sortKeys });
      initPathBar(ui.treeEl, ui.pathBar);
      // Re-apply search if active
      if (ui.searchInput.value) applySearch(ui.searchInput.value, ui.treeEl, ui.searchCount);
    });

    // Copy all
    ui.copyBtn.addEventListener('click', () => copyToClipboard(rawText));

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
        // Focus textarea when opening
        const ta = document.getElementById('prism-schema-textarea');
        if (ta) setTimeout(() => ta.focus(), 60);
      }
    });

    // Close button inside dialog
    document.getElementById('prism-schema-panel')?.querySelector('.prism-schema-close')
      ?.addEventListener('click', () => {
        const overlay = document.getElementById('prism-schema-panel');
        if (overlay) overlay.classList.add('prism-hidden');
        ui.schemaBtn.classList.remove('prism-active');
      });

    // Close on backdrop click
    document.getElementById('prism-schema-panel')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('prism-schema-panel')) {
        document.getElementById('prism-schema-panel').classList.add('prism-hidden');
        ui.schemaBtn.classList.remove('prism-active');
      }
    });

    // Schema validate
    document.getElementById('prism-validate-btn')?.addEventListener('click', () => {
      const ta = document.getElementById('prism-schema-textarea');
      if (ta) {
        validateSchema(ta.value, ui.treeEl);
        const wrap = document.getElementById('prism-schema-results-wrap');
        if (wrap) wrap.classList.remove('prism-hidden');
      }
    });

    document.getElementById('prism-schema-clear-btn')?.addEventListener('click', () => {
      ui.treeEl.querySelectorAll('.prism-schema-error').forEach(el => el.classList.remove('prism-schema-error'));
      const r = document.getElementById('prism-schema-results');
      if (r) r.innerHTML = '';
      const wrap = document.getElementById('prism-schema-results-wrap');
      if (wrap) wrap.classList.add('prism-hidden');
    });

    // Theme toggle
    ui.themeBtn.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      ui.root.className = `prism-root prism-theme-${currentTheme}`;
      updateThemeIcon(ui.themeBtn, currentTheme);
      saveTheme(currentTheme);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const mac = navigator.platform.toUpperCase().includes('MAC');
      const mod = mac ? e.metaKey : e.ctrlKey;

      if (mod && e.key === 'f') {
        e.preventDefault();
        ui.searchInput.focus();
        ui.searchInput.select();
      }
      if (mod && e.key === 'k') {
        e.preventDefault();
        copyToClipboard(rawText);
      }
      if (mod && e.key === '\\') {
        e.preventDefault();
        ui.rawBtn.click();
      }
    });

    // Toggle visibility from popup/detector
    window.addEventListener('prism-toggle', () => {
      isVisible = !isVisible;
      ui.root.style.display = isVisible ? '' : 'none';
    });

    // Theme change from popup
    window.addEventListener('prism-set-theme', (e) => {
      const theme = e.detail;
      if (theme === 'auto') {
        currentTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      } else {
        currentTheme = theme;
      }
      ui.root.className = `prism-root prism-theme-${currentTheme}`;
      updateThemeIcon(ui.themeBtn, currentTheme);
    });
  }

  function updateThemeIcon(btn, theme) {
    btn.innerHTML = '';
    const iconEl = document.createElement('span');
    iconEl.className = 'prism-btn-icon-wrap';
    iconEl.innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
    btn.appendChild(iconEl);
    btn.title = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  }

    init();
  } // end main()
})();
