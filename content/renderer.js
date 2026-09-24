/* content/renderer.js — tree rendering, path bar, error card */
'use strict';

window.Prism = window.Prism || {};

window.Prism.renderTree = function renderTree(data, treeEl, opts) {
  treeEl.innerHTML = '';
  window.Prism.state.searchIndexCache = [];
  window.Prism._renderValue(data, null, '$', 0, treeEl, opts, true);
};

window.Prism._renderValue = function renderValue(value, key, path, depth, parentEl, opts, isLast) {
  const type = window.Prism._getType(value);
  const nodeEl = document.createElement('div');
  nodeEl.className = 'prism-node';
  nodeEl.dataset.path = path;
  nodeEl.dataset.type = type;

  if (type === 'object' || type === 'array') {
    window.Prism._renderCollapsible(value, key, path, depth, nodeEl, opts, isLast);
  } else {
    window.Prism._renderScalar(value, key, path, type, depth, nodeEl, isLast);
  }

  parentEl.appendChild(nodeEl);
};

window.Prism._renderCollapsible = function renderCollapsible(value, key, path, depth, nodeEl, opts, isLast) {
  const ICONS = window.Prism.ICONS;
  const isArray = Array.isArray(value);
  const entries = isArray ? value : window.Prism._getSortedEntries(value, opts.sortKeys);
  const count = entries.length;
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  if (depth >= 3) nodeEl.classList.add('prism-collapsed');

  const header = document.createElement('div');
  header.className = 'prism-node-header';

  const toggle = document.createElement('button');
  toggle.className = 'prism-toggle';
  toggle.setAttribute('aria-label', 'Toggle');
  toggle.innerHTML = ICONS.triangle;

  if (key !== null) {
    header.appendChild(window.Prism._makeKey(key));
    header.appendChild(window.Prism._makeColon());
  }
  header.appendChild(toggle);
  header.appendChild(window.Prism._makeBracket(openBracket));

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

  header.appendChild(window.Prism._makeCopyBtn(() => JSON.stringify(value, null, 2)));
  header.appendChild(window.Prism._makePathBtn(path));

  nodeEl.appendChild(header);

  const childrenEl = document.createElement('div');
  childrenEl.className = 'prism-children';
  if (isArray) {
    value.forEach((item, i) => {
      window.Prism._renderValue(item, null, `${path}[${i}]`, depth + 1, childrenEl, opts, i === value.length - 1);
    });
  } else {
    entries.forEach(([k, v], i) => {
      const childPath = `${path}.${/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `["${k}"]`}`;
      window.Prism._renderValue(v, k, childPath, depth + 1, childrenEl, opts, i === entries.length - 1);
    });
  }
  nodeEl.appendChild(childrenEl);

  const bracketClose = document.createElement('div');
  bracketClose.className = 'prism-bracket-close';
  bracketClose.textContent = closeBracket + (isLast ? '' : ',');
  nodeEl.appendChild(bracketClose);

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    nodeEl.classList.toggle('prism-collapsed');
  });

  window.Prism.state.searchIndexCache.push({ path, keyText: key ?? '', valueText: '', nodeEl: header });
};

window.Prism._renderScalar = function renderScalar(value, key, path, type, depth, nodeEl, isLast) {
  const header = document.createElement('div');
  header.className = 'prism-node-header';

  const placeholder = document.createElement('span');
  placeholder.className = 'prism-toggle-placeholder';
  header.appendChild(placeholder);

  if (key !== null) {
    header.appendChild(window.Prism._makeKey(key));
    header.appendChild(window.Prism._makeColon());
  }

  const valueEl = window.Prism._renderScalarValue(value, type);
  header.appendChild(valueEl);

  const comma = document.createElement('span');
  comma.className = 'prism-comma';
  comma.textContent = isLast ? '' : ',';
  header.appendChild(comma);

  header.appendChild(window.Prism._makeCopyBtn(() => JSON.stringify(value)));
  if (type === 'string' && /^https?:\/\//.test(value)) {
    header.appendChild(window.Prism._makeOpenUrlBtn(value));
  }
  header.appendChild(window.Prism._makePathBtn(path));

  nodeEl.appendChild(header);

  const rawVal = value === null ? 'null' : String(value);
  window.Prism.state.searchIndexCache.push({ path, keyText: key ?? '', valueText: rawVal, nodeEl: header, valueEl });
};

window.Prism._renderScalarValue = function renderScalarValue(value, type) {
  const span = document.createElement('span');
  if (type === 'string') {
    if (/^https?:\/\//.test(value)) {
      span.className = 'prism-value-url';
      span.textContent = `"${value}"`;
    } else {
      span.className = 'prism-value-string';
      span.textContent = `"${value}"`;
    }
  } else if (type === 'number') {
    span.className = 'prism-value-number';
    span.textContent = String(value);
  } else if (type === 'boolean') {
    span.className = 'prism-value-boolean';
    span.textContent = String(value);
  } else {
    span.className = 'prism-value-null';
    span.textContent = 'null';
  }
  return span;
};

window.Prism._makeKey = function makeKey(key) {
  const span = document.createElement('span');
  span.className = 'prism-key';
  span.textContent = `"${key}"`;
  return span;
};

window.Prism._makeColon = function makeColon() {
  const span = document.createElement('span');
  span.className = 'prism-colon';
  span.textContent = ': ';
  return span;
};

window.Prism._makeBracket = function makeBracket(char) {
  const span = document.createElement('span');
  span.className = 'prism-bracket';
  span.textContent = char;
  return span;
};

window.Prism._makeCopyBtn = function makeCopyBtn(getVal) {
  const ICONS = window.Prism.ICONS;
  const btn = document.createElement('button');
  btn.className = 'prism-copy-val';
  btn.title = 'Copy value';
  btn.innerHTML = ICONS.copy;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.Prism.copyToClipboard(getVal());
  });
  return btn;
};

window.Prism._makePathBtn = function makePathBtn(path) {
  const ICONS = window.Prism.ICONS;
  const btn = document.createElement('button');
  btn.className = 'prism-copy-path';
  btn.title = 'Copy JSON path';
  btn.innerHTML = ICONS.path;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.Prism.copyToClipboard(path);
    window.Prism.showToast('Path copied!');
  });
  return btn;
};

window.Prism._makeOpenUrlBtn = function makeOpenUrlBtn(url) {
  const btn = document.createElement('button');
  btn.className = 'prism-open-url';
  btn.title = 'Open URL in new tab';
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  return btn;
};

window.Prism._getSortedEntries = function getSortedEntries(obj, sort) {
  const entries = Object.entries(obj);
  if (sort) entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries;
};

window.Prism._getType = function getType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

window.Prism.renderError = function renderError(treeEl, parseError, rawText) {
  const ICONS = window.Prism.ICONS;
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
};

window.Prism.initPathBar = function initPathBar(treeEl, pathBar) {
  treeEl.addEventListener('mouseover', (e) => {
    const node = e.target.closest('[data-path]');
    if (node) pathBar.textContent = node.dataset.path;
  });
  treeEl.addEventListener('mouseleave', () => {
    pathBar.textContent = '$';
  });
};

window.Prism.collapseAll = function collapseAll(treeEl) {
  treeEl.querySelectorAll('.prism-node').forEach(el => {
    const hasChildren = el.querySelector('.prism-children');
    if (hasChildren) el.classList.add('prism-collapsed');
  });
};

window.Prism.expandAll = function expandAll(treeEl) {
  treeEl.querySelectorAll('.prism-node.prism-collapsed').forEach(el => {
    el.classList.remove('prism-collapsed');
  });
};
