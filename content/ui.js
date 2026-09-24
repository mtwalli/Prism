/* content/ui.js — icons, toolbar, shell builder */
'use strict';

window.Prism = window.Prism || {};

window.Prism.ICONS = {
  copy:         `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
  download:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5v-2z"/></svg>`,
  schema:       `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
  sort:         `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h6v-2H3v2zm0-5h12v-2H3v2zm0-7v2h18V6H3z"/></svg>`,
  sun:          `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .38-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.38.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.03 0-1.41-.38-.39-1.03-.39-1.41 0zM7.05 18.36l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41-.39-.38-1.03-.39-1.41 0z"/></svg>`,
  moon:         `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>`,
  check:        `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
  error:        `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
  triangle:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 17l5-5-5-5v10z"/></svg>`,
  search:       `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
  arrow_up:     `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>`,
  arrow_down:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`,
  code:         `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
  path:         `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>`,
  collapse_all: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5h2v14H8zm3 7l4-4v8z"/></svg>`,
  expand_all:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 5h2v14h-2zm-3 7L7 8v8z"/></svg>`,
};

window.Prism.makeBtn = function makeBtn(label, svgStr, id, title) {
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
};

window.Prism.makeSep = function makeSep() {
  const s = document.createElement('div');
  s.className = 'prism-toolbar-sep';
  return s;
};

window.Prism.buildShell = function buildShell(stats, currentTheme, formatBytes, parseError, buildSchemaPanel) {
  const ICONS = window.Prism.ICONS;
  const makeBtn = window.Prism.makeBtn;
  const makeSep = window.Prism.makeSep;

  const root = document.createElement('div');
  root.id = 'prism-root';
  root.className = `prism-root prism-theme-${currentTheme}`;

  const header = document.createElement('div');
  header.className = 'prism-header';

  const logo = document.createElement('div');
  logo.className = 'prism-logo';
  logo.innerHTML = '<svg class="prism-logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L22 9L12 22L2 9Z" fill="currentColor"/></svg><span class="prism-logo-word">Prism</span>';

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

  // Search field
  const searchWrap = document.createElement('div');
  searchWrap.className = 'prism-search-wrap';
  const searchIconEl = document.createElement('span');
  searchIconEl.className = 'prism-search-icon';
  searchIconEl.setAttribute('aria-hidden', 'true');
  searchIconEl.innerHTML = ICONS.search;
  const searchSvg = searchIconEl.querySelector('svg');
  if (searchSvg) { searchSvg.setAttribute('width', '14'); searchSvg.setAttribute('height', '14'); }
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'prism-search';
  searchInput.placeholder = 'Search…';
  searchInput.setAttribute('aria-label', 'Search JSON');
  searchWrap.appendChild(searchIconEl);
  searchWrap.appendChild(searchInput);

  const searchCount = document.createElement('span');
  searchCount.className = 'prism-search-count';

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

  // Toolbar buttons
  const collapseAllBtn = makeBtn('Collapse', ICONS.collapse_all, 'prism-collapse-all-btn', 'Collapse all nodes');
  collapseAllBtn.classList.add('prism-btn-labeled');
  const expandAllBtn   = makeBtn('Expand',   ICONS.expand_all,   'prism-expand-all-btn',   'Expand all nodes');
  expandAllBtn.classList.add('prism-btn-labeled');
  const rawBtn         = makeBtn('Raw',    ICONS.code,     'prism-raw-btn',      'Toggle raw/formatted view (Ctrl+\\)');
  rawBtn.classList.add('prism-btn-labeled');
  const sortBtn        = makeBtn('Sort',   ICONS.sort,     'prism-sort-btn',     'Sort object keys alphabetically');
  sortBtn.classList.add('prism-btn-labeled');
  const copyBtn        = makeBtn('Copy',   ICONS.copy,     'prism-copy-btn-all', 'Copy JSON (Ctrl+K)');
  copyBtn.classList.add('prism-btn-labeled');
  const dlBtn          = makeBtn('Save',   ICONS.download, 'prism-dl-btn',       'Download as .json');
  dlBtn.classList.add('prism-btn-labeled');
  const schemaBtn      = makeBtn('Schema', ICONS.schema,   'prism-schema-btn',   'Validate against JSON Schema');
  schemaBtn.classList.add('prism-btn-labeled');
  const themeBtn       = makeBtn('',       null,           'prism-theme-btn',    'Toggle theme');
  themeBtn.classList.add('prism-btn-icon');

  const sep1 = makeSep();
  const sep2 = makeSep();
  const sep3 = makeSep();
  const sep4 = makeSep();

  [searchWrap, searchCount, searchNav, sep1,
   collapseAllBtn, expandAllBtn, sep2,
   rawBtn, sortBtn, sep3, copyBtn, dlBtn, sep4, schemaBtn, themeBtn]
    .forEach(el => toolbar.appendChild(el));
  [logo, headerDiv, statsEl, toolbar].forEach(el => header.appendChild(el));

  const schemaPanel = buildSchemaPanel();

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
  rawPre.id = 'prism-raw-pre';
  rawView.appendChild(rawPre);

  main.appendChild(treeWrap);
  main.appendChild(rawView);

  const pathBar = document.createElement('div');
  pathBar.className = 'prism-path-bar';
  pathBar.id = 'prism-path-bar';
  pathBar.textContent = '$';

  const toast = document.createElement('div');
  toast.className = 'prism-toast';
  toast.id = 'prism-toast';

  [header, main, pathBar, toast, schemaPanel].forEach(el => root.appendChild(el));

  return {
    root, treeEl, rawView, rawPre, pathBar, toast,
    searchInput, searchCount, prevBtn, nextBtn,
    rawBtn, sortBtn, copyBtn, dlBtn, schemaBtn, themeBtn,
    collapseAllBtn, expandAllBtn,
  };
};

window.Prism.updateThemeIcon = function updateThemeIcon(btn, theme) {
  const ICONS = window.Prism.ICONS;
  btn.innerHTML = '';
  const iconEl = document.createElement('span');
  iconEl.className = 'prism-btn-icon-wrap';
  iconEl.innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
  btn.appendChild(iconEl);
  btn.title = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
};
