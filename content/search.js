/* content/search.js — search, highlight, navigation */
'use strict';

window.Prism = window.Prism || {};

let _searchDebounce = null;

window.Prism.onSearchInput = function onSearchInput(query, treeEl, searchCount) {
  clearTimeout(_searchDebounce);
  _searchDebounce = setTimeout(() => window.Prism.applySearch(query, treeEl, searchCount), 200);
};

window.Prism.applySearch = function applySearch(query, treeEl, searchCount) {
  const state = window.Prism.state;

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
  state.searchMatches = [];
  state.searchIndex = 0;

  const q = query.trim().toLowerCase();
  if (!q) {
    searchCount.textContent = '';
    return;
  }

  state.searchIndexCache.forEach(({ keyText, valueText, nodeEl }) => {
    const keyMatch = keyText.toLowerCase().includes(q);
    const valMatch = valueText.toLowerCase().includes(q);
    if (keyMatch || valMatch) {
      nodeEl.classList.add('prism-search-match');
      state.searchMatches.push(nodeEl);
      window.Prism.expandAncestors(nodeEl);
      if (keyMatch) window.Prism._highlightText(nodeEl.querySelector('.prism-key'), q);
      if (valMatch) window.Prism._highlightText(nodeEl.querySelector('[class^="prism-value"]'), q);
    }
  });

  searchCount.textContent = state.searchMatches.length ? `${state.searchMatches.length}` : '0';

  if (state.searchMatches.length) {
    state.searchIndex = 0;
    window.Prism._scrollToMatch(0);
  }
};

window.Prism.navigateSearch = function navigateSearch(dir, searchCount) {
  const state = window.Prism.state;
  if (!state.searchMatches.length) return;
  state.searchIndex = (state.searchIndex + dir + state.searchMatches.length) % state.searchMatches.length;
  searchCount.textContent = `${state.searchIndex + 1}/${state.searchMatches.length}`;
  window.Prism._scrollToMatch(state.searchIndex);
};

window.Prism._scrollToMatch = function scrollToMatch(idx) {
  const state = window.Prism.state;
  state.searchMatches.forEach((el, i) => el.classList.toggle('prism-search-current', i === idx));
  const el = state.searchMatches[idx];
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.Prism.expandAncestors = function expandAncestors(el) {
  let parent = el.parentElement;
  while (parent && parent.id !== 'prism-tree') {
    if (parent.classList.contains('prism-node') && parent.classList.contains('prism-collapsed')) {
      parent.classList.remove('prism-collapsed');
    }
    parent = parent.parentElement;
  }
};

window.Prism._highlightText = function highlightText(el, query) {
  if (!el) return;
  const text = el.textContent;
  const lower = text.toLowerCase();
  let result = '';
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(query, i);
    if (idx === -1) { result += window.Prism._escapeHtml(text.slice(i)); break; }
    result += window.Prism._escapeHtml(text.slice(i, idx));
    result += `<mark class="prism-hl">${window.Prism._escapeHtml(text.slice(idx, idx + query.length))}</mark>`;
    i = idx + query.length;
  }
  el.innerHTML = result;
};

window.Prism._escapeHtml = function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
