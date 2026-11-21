/* Cute Bunny — swipe interactions for chat, notifications, navigation, and shop browsing. */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const pageOrder = ['home', 'gallery', 'music', 'notes', 'friends', 'streak'];
  const pointer = { active: false, id: null, startX: 0, startY: 0, lastX: 0, lastY: 0, target: null, mode: '', shopScrollLeft: 0, shopDragged: false };
  let suppressClickUntil = 0;

  const closest = (target, selector) => target instanceof Element ? target.closest(selector) : null;
  const isEditable = target => !!closest(target, 'input, textarea, select, [contenteditable="true"], button, a, [role="button"]');
  const isNestedSwipeArea = target => !!closest(target, '.sg-collectible-grid, #notificationList, .chat-thread, .chat-composer, .now-playing-panel, .photo-lightbox, .auth-gate');

  function begin(event) {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const target = event.target;
    let mode = '';
    let surface = null;

    const bubble = closest(target, '.chat-message .chat-bubble[data-chat-message-id]');
    const notification = closest(target, '.notification-row[data-notification-row]');
    if (event.pointerType === 'mouse' && closest(target, '.sg-collectible-grid') && !isEditable(target)) {
      mode = 'shop'; surface = closest(target, '.sg-collectible-grid');
    } else if (bubble && !closest(target, 'button, a, input, textarea, select, [contenteditable="true"]')) {
      mode = 'reply'; surface = bubble;
    } else if (notification) {
      mode = 'notification'; surface = notification;
    } else if (closest(target, '#mainContent') && !isEditable(target) && !isNestedSwipeArea(target)) {
      mode = 'pages'; surface = document.querySelector('#mainContent');
    }
    if (!mode) return;

    pointer.active = true;
    pointer.id = event.pointerId;
    pointer.startX = pointer.lastX = event.clientX;
    pointer.startY = pointer.lastY = event.clientY;
    pointer.target = surface;
    pointer.mode = mode;
    pointer.shopScrollLeft = mode === 'shop' ? surface.scrollLeft : 0;
    pointer.shopDragged = false;
    try { target.setPointerCapture?.(event.pointerId); } catch (_) {}
  }

  function move(event) {
    if (!pointer.active || event.pointerId !== pointer.id) return;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    if (Math.abs(dy) > Math.abs(dx) * 1.15 && Math.abs(dy) > 10) {
      pointer.mode = '';
      pointer.target?.style.removeProperty('--cb-swipe-x');
      pointer.target?.classList.remove('cb-swipe-tracking');
      return;
    }
    if (pointer.mode === 'shop') {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        pointer.shopDragged = true;
        pointer.target.scrollLeft = pointer.shopScrollLeft - dx;
        pointer.target.classList.add('cb-shop-dragging');
      }
      return;
    }
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (pointer.mode === 'reply' && dx > 0) {
      pointer.target.style.setProperty('--cb-swipe-x', Math.min(76, dx * .58) + 'px');
      pointer.target.classList.add('cb-swipe-tracking');
    } else if (pointer.mode === 'notification' && dx < 0) {
      pointer.target.style.setProperty('--cb-swipe-x', Math.max(-92, dx * .7) + 'px');
      pointer.target.classList.add('cb-swipe-tracking');
    }
  }

  async function finish(event) {
    if (!pointer.active || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    const mode = pointer.mode;
    const target = pointer.target;
    pointer.active = false;
    pointer.id = null;
    pointer.mode = '';
    pointer.target = null;
    if (!target) return;
    if (mode === 'shop') {
      target.classList.remove('cb-shop-dragging');
      if (Math.abs(dx) > 8) suppressClickUntil = Date.now() + 350;
      return;
    }

    const clearTracking = () => {
      target.style.removeProperty('--cb-swipe-x');
      target.classList.remove('cb-swipe-tracking');
    };

    if (mode === 'reply' && dx >= 76 && Math.abs(dy) < 58) {
      clearTracking();
      const messageId = String(target.dataset.chatMessageId || '');
      if (!messageId) return;
      suppressClickUntil = Date.now() + 650;
      try {
        replyingToMessageId = messageId;
        hideMessageActions();
        if (page !== 'notes') go('notes');
        else renderNotesPage();
        document.querySelector('#chatInput')?.focus({ preventScroll: true });
        if (typeof syncNotesKeyboardLayout === 'function') syncNotesKeyboardLayout();
      } catch (error) { console.warn('Swipe reply could not open:', error); }
      return;
    }

    if (mode === 'notification' && dx <= -78 && Math.abs(dy) < 58) {
      suppressClickUntil = Date.now() + 650;
      target.classList.add('cb-swipe-dismiss');
      if (!reducedMotion) await new Promise(resolve => setTimeout(resolve, 170));
      const id = String(target.dataset.notificationRow || '');
      try {
        await dismissNotification(id);
      } catch (error) {
        target.classList.remove('cb-swipe-dismiss');
        clearTracking();
        console.warn('Notification swipe dismissal failed:', error);
      }
      return;
    }

    clearTracking();
    if (mode === 'pages' && Math.abs(dx) >= 88 && Math.abs(dy) < 60) {
      const current = typeof page === 'string' ? page : '';
      const index = pageOrder.indexOf(current);
      const next = pageOrder[index + (dx < 0 ? 1 : -1)];
      if (next) { suppressClickUntil = Date.now() + 300; go(next); }
    }
  }

  document.addEventListener('pointerdown', begin, { capture: true, passive: true });
  document.addEventListener('pointermove', move, { capture: true, passive: true });
  document.addEventListener('pointerup', finish, { capture: true, passive: true });
  document.addEventListener('pointercancel', event => {
    if (!pointer.active || event.pointerId !== pointer.id) return;
    pointer.target?.style.removeProperty('--cb-swipe-x');
    pointer.target?.classList.remove('cb-swipe-tracking', 'cb-shop-dragging');
    pointer.active = false; pointer.id = null; pointer.target = null; pointer.mode = '';
  }, { capture: true, passive: true });

  document.addEventListener('click', event => {
    if (Date.now() < suppressClickUntil && closest(event.target, '.chat-message .chat-bubble, .notification-row, .sg-collectible-grid')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // The shop becomes a native snap-scroller on narrow screens; normal grid layout
  // remains intact on desktop and all purchase/equip buttons retain their handlers.
  document.addEventListener('focusin', event => { const grid = event.target.closest?.('.sg-collectible-grid'); if (grid) grid.setAttribute('aria-label', 'Swipe horizontally to browse garden collectibles'); });
})();
