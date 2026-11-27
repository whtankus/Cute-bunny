/* Cute Bunny core DOM helpers. Loaded before the main application. */
(() => {
  'use strict';
  const query = selector => document.querySelector(selector);
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  window.CuteBunnyCore = Object.freeze({ query, escapeHtml });
})();
