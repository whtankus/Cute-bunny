/* Cute Bunny Preview — unified pointer-based gesture controller. */
(() => {
  'use strict';

  const PAGE_ORDER = ['home', 'gallery', 'music', 'notes', 'friends', 'streak'];
  const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const state = {
    pointerId: null, pointerType: '', mode: '', target: null,
    startX: 0, startY: 0, lastX: 0, lastY: 0, startTime: 0,
    moved: false
  };
  let suppressClickUntil = 0;

  const closest = (target, selector) => target instanceof Element ? target.closest(selector) : null;
  const isControl = target => !!closest(target, 'button, a, input, textarea, select, [contenteditable="true"], [role="button"]');
  // The Garden Shop remains a normal grid and is excluded from page swipes.
  const isNestedSurface = target => !!closest(target,
    '.sg-collectible-grid, #notificationList, .chat-thread, .chat-composer, .now-playing-panel, .photo-lightbox, .auth-gate');

  function resetVisuals() {
    if (!state.target) return;
    state.target.style.removeProperty('--cb-swipe-x');
    state.target.classList.remove('cb-swipe-tracking');
  }

  function reset() {
    resetVisuals();
    state.pointerId = null;
    state.pointerType = '';
    state.mode = '';
    state.target = null;
    state.moved = false;
  }

  function begin(event) {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (state.pointerId !== null) return;

    const target = event.target;
    let mode = '';
    let surface = null;
    const bubble = closest(target, '.chat-message .chat-bubble[data-chat-message-id]');
    const notification = closest(target, '.notification-row[data-notification-row]');

    if (bubble && !isControl(target)) {
      mode = 'reply';
      surface = bubble;
    } else if (notification && !isControl(target)) {
      mode = 'notification';
      surface = notification;
    } else if (closest(target, '#mainContent') && !isControl(target) && !isNestedSurface(target)) {
      mode = 'pages';
      surface = document.querySelector('#mainContent');
    }

    if (!mode || !surface) return;
    state.pointerId = event.pointerId;
    state.pointerType = event.pointerType;
    state.mode = mode;
    state.target = surface;
    state.startX = state.lastX = event.clientX;
    state.startY = state.lastY = event.clientY;
    state.startTime = performance.now();
    state.moved = false;
    try { surface.setPointerCapture(event.pointerId); } catch (_) {}
  }

  function move(event) {
    if (state.pointerId === null || event.pointerId !== state.pointerId || !state.target) return;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    const absX = Math.abs(dx), absY = Math.abs(dy);

    if (!state.moved && Math.max(absX, absY) < 8) return;
    if (absY > absX * 1.15) { reset(); return; }
    if (absX < absY * 1.15) return;
    state.moved = true;

    if (state.mode === 'reply' && dx > 0) {
      state.target.style.setProperty('--cb-swipe-x', Math.min(82, dx * .62) + 'px');
      state.target.classList.add('cb-swipe-tracking');
    } else if (state.mode === 'notification' && dx < 0) {
      state.target.style.setProperty('--cb-swipe-x', Math.max(-104, dx * .72) + 'px');
      state.target.classList.add('cb-swipe-tracking');
    } else if (state.mode === 'pages') {
      state.target.style.setProperty('--cb-swipe-x', Math.max(-42, Math.min(42, dx * .12)) + 'px');
    }
  }

  async function finish(event) {
    if (state.pointerId === null || event.pointerId !== state.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    const elapsed = Math.max(1, performance.now() - state.startTime);
    const velocity = Math.abs(dx) / elapsed;
    const mode = state.mode;
    const target = state.target;
    const moved = state.moved;
    reset();
    if (!target || !moved || Math.abs(dy) > 64) return;

    if (mode === 'reply' && dx > 0 && (dx >= 64 || (dx >= 38 && velocity >= .45))) {
      const messageId = String(target.dataset.chatMessageId || '');
      if (!messageId) return;
      suppressClickUntil = Date.now() + 600;
      try {
        replyingToMessageId = messageId;
        hideMessageActions();
        if (page !== 'notes') go('notes');
        else renderNotesPage();
        requestAnimationFrame(() => {
          document.querySelector('#chatInput')?.focus({ preventScroll: true });
          if (typeof syncNotesKeyboardLayout === 'function') syncNotesKeyboardLayout();
        });
      } catch (error) { console.warn('Cute Bunny Preview swipe reply failed:', error); }
      return;
    }

    if (mode === 'notification' && dx < 0 && (dx <= -70 || (dx <= -42 && velocity >= .45))) {
      const id = String(target.dataset.notificationRow || '');
      if (!id) return;
      suppressClickUntil = Date.now() + 600;
      target.classList.add('cb-swipe-dismiss');
      if (!REDUCED_MOTION) await new Promise(resolve => setTimeout(resolve, 170));
      try { await dismissNotification(id); }
      catch (error) {
        target.classList.remove('cb-swipe-dismiss');
        console.warn('Cute Bunny Preview notification swipe failed:', error);
      }
      return;
    }

    if (mode === 'pages' && Math.abs(dx) >= 82) {
      const currentIndex = PAGE_ORDER.indexOf(typeof page === 'string' ? page : '');
      const nextPage = PAGE_ORDER[currentIndex + (dx < 0 ? 1 : -1)];
      if (nextPage) {
        suppressClickUntil = Date.now() + 300;
        go(nextPage);
      }
    }
  }

  document.addEventListener('pointerdown', begin, { capture: true, passive: true });
  document.addEventListener('pointermove', move, { capture: true, passive: true });
  document.addEventListener('pointerup', finish, { capture: true, passive: true });
  document.addEventListener('pointercancel', event => {
    if (event.pointerId === state.pointerId) reset();
  }, { capture: true, passive: true });
  window.addEventListener('blur', reset);

  document.addEventListener('click', event => {
    if (Date.now() < suppressClickUntil &&
        closest(event.target, '.chat-message .chat-bubble, .notification-row, #mainContent')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
})();
