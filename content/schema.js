/* content/schema.js — schema panel UI, validation logic */
'use strict';

window.Prism = window.Prism || {};

window.Prism.buildSchemaPanel = function buildSchemaPanel() {
  const ICONS = window.Prism.ICONS;

  const overlay = document.createElement('div');
  overlay.className = 'prism-schema-overlay prism-hidden';
  overlay.id = 'prism-schema-panel';

  const dialog = document.createElement('div');
  dialog.className = 'prism-schema-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'prism-schema-title');

  // Title bar
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

  // Body
  const body = document.createElement('div');
  body.className = 'prism-schema-body';

  const fieldWrap = document.createElement('div');
  fieldWrap.className = 'prism-schema-field-wrap';

  const fieldLabel = document.createElement('label');
  fieldLabel.className = 'prism-schema-field-label';
  fieldLabel.textContent = 'JSON Schema (Draft-07)';
  fieldLabel.htmlFor = 'prism-schema-textarea';

  const textarea = document.createElement('textarea');
  textarea.className = 'prism-schema-textarea';
  textarea.placeholder = 'Paste your JSON Schema here…';
  textarea.id = 'prism-schema-textarea';
  textarea.spellcheck = false;

  fieldWrap.appendChild(fieldLabel);
  fieldWrap.appendChild(textarea);

  const actions = document.createElement('div');
  actions.className = 'prism-schema-actions';

  const validateBtn = document.createElement('button');
  validateBtn.id = 'prism-validate-btn';
  validateBtn.title = 'Validate JSON against schema';
  validateBtn.className = 'prism-schema-btn-action prism-schema-btn-filled';
  validateBtn.textContent = 'Validate';

  const clearBtn = document.createElement('button');
  clearBtn.id = 'prism-schema-clear-btn';
  clearBtn.title = 'Clear schema error highlights';
  clearBtn.className = 'prism-schema-btn-action';
  clearBtn.textContent = 'Clear errors';

  actions.appendChild(validateBtn);
  actions.appendChild(clearBtn);

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

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'prism-schema-resize';
  resizeHandle.title = 'Drag to resize';
  resizeHandle.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M11 5h2v2h-2zm0 4h2v2h-2zM7 9h2v2H7zm4 4h2v2h-2zM7 13h2v2H7zM3 13h2v2H3z"/></svg>`;

  dialog.appendChild(titleBar);
  dialog.appendChild(body);
  dialog.appendChild(resizeHandle);
  overlay.appendChild(dialog);

  // Drag logic
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

  // Resize logic
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
};

window.Prism.validateSchema = function validateSchema(schemaText, treeEl, parsedData) {
  const ICONS = window.Prism.ICONS;
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
    msg.innerHTML = `<span class="prism-schema-err-path">Schema parse error</span><span class="prism-schema-err-msg">${window.Prism._escapeHtml(err.message)}</span>`;
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

        const jexPath = window.Prism._jsonPointerToPath(err.instancePath);
        const node = treeEl.querySelector(`[data-path="${CSS.escape(jexPath)}"]`);
        if (node) {
          const header = node.querySelector('.prism-node-header');
          if (header) header.classList.add('prism-schema-error');
          window.Prism.expandAncestors(node);
        }
      });
    }
  } catch (err) {
    const msg = document.createElement('div');
    msg.className = 'prism-schema-error-item';
    msg.innerHTML = `<span class="prism-schema-err-path">Validation error</span><span class="prism-schema-err-msg">${window.Prism._escapeHtml(err.message)}</span>`;
    results.appendChild(msg);
  }
};

window.Prism._jsonPointerToPath = function jsonPointerToPath(pointer) {
  if (!pointer) return '$';
  return '$' + pointer.split('/').slice(1).map(seg => {
    const decoded = seg.replace(/~1/g, '/').replace(/~0/g, '~');
    return /^\d+$/.test(decoded) ? `[${decoded}]` : `.${decoded}`;
  }).join('');
};
