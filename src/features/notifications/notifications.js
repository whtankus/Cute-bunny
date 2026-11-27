/* notifications feature functions; classic-script compatibility with current app state. */
'use strict';

async function loadNotifications() {
  if (!me || notificationLoading) return;
  const req = me.id;
  notificationLoading = true;
  try {
    const rows = await api('/notifications');
    if (me?.id !== req) return;
    notificationRows = rows;
    notificationLoaded = true;
    updateNotificationBadge();
    if (['gallery', 'music', 'notes', 'friends'].includes(page)) void markNavNotificationsSeen(page);
    observeNotificationMemoryViews();
  } catch {}
  finally {
    if (me?.id === req) {
      notificationLoading = false;
      if (!$('#notificationGate').classList.contains('hidden')) renderNotifications();
    }
  }
}

async function showPhoneNotification(notification) {
  if (!notification || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  let enabled = false;
  try { enabled = localStorage.getItem('cuteBunnyPhoneNotifications') === 'on'; } catch {}
  if (!enabled || !('serviceWorker' in navigator)) return;
  const prefs = me?.notification_preferences || {};
  const isBuddyNotification = notification.kind === 'buddy';
  if (isBuddyNotification && prefs.buddy === false) return;
  if (!isBuddyNotification && prefs.memories === false) return;
  const actor = Array.isArray(notification.actor) ? notification.actor[0] : (notification.actor || {});
  const title = actor.display_name || actor.username || 'A little hello from Cute Bunny';
  const body = String(notification.message || 'Your friend shared something with you.').slice(0, 160);
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: './bunny-app-icon-192.png',
      badge: './bunny-app-icon-192.png',
      tag: 'cute-bunny-' + String(notification.id),
      renotify: false,
      data: { url: './', notificationId: String(notification.id) }
    });
  } catch (error) {
    console.warn('Phone notification could not be shown:', error?.message || error);
  }
}

function updateNotificationBadge() {
  const badge = $('#notificationBadge'), count = notificationRows.filter(n => !n.read_at).length;
  badge.textContent = count > 9 ? '9+' : String(count);
  badge.classList.toggle('hidden', count === 0);
  updateNavNewDots();
}

function updateNavNewDots() {
  const pageKinds = { gallery: ['photo'], music: ['song'], notes: ['note'], friends: ['buddy'] };
  const pageLabels = { gallery: 'Photos', music: 'Music', notes: 'Notes', friends: 'Friends' };
  document.querySelectorAll('#nav button[data-page]').forEach(button => {
    const targetPage = button.dataset.page;
    const kinds = pageKinds[targetPage] || [];
    const isCurrentTab = targetPage === page;
    const hasNew = !isCurrentTab && notificationRows.some(row => !row.read_at && kinds.includes(String(row.kind || '').toLowerCase()));
    button.querySelector('.nav-new-dot')?.classList.toggle('is-visible', hasNew);
    if (hasNew) button.setAttribute('aria-label', (pageLabels[targetPage] || targetPage) + ', new activity');
    else button.removeAttribute('aria-label');
  });
}

async function markNavNotificationsSeen(targetPage) {
  const pageKinds = { gallery: ['photo'], music: ['song'], notes: ['note'], friends: ['buddy'] };
  const kinds = pageKinds[targetPage];
  if (!kinds?.length || !me) return;
  const rows = notificationRows.filter(row => !row.read_at && kinds.includes(String(row.kind || '').toLowerCase()));
  if (!rows.length) return;
  const readAt = new Date().toISOString();
  rows.forEach(row => { row.read_at = readAt; });
  updateNotificationBadge();
  try {
    await api('/notifications/read', { method: 'PUT', body: JSON.stringify({ ids: rows.map(row => String(row.id)) }) });
  } catch (error) {
    rows.forEach(row => { if (row.read_at === readAt) row.read_at = null; });
    updateNotificationBadge();
    console.warn('Navigation activity could not be marked as seen:', error?.message || error);
  }
}

function notificationGroupLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Earlier';
  const today = new Date(), yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Earlier';
}

function notificationKindMeta(notification) {
  const kind = String(notification?.kind || '').toLowerCase();
  if (kind === 'buddy') return /bearfriend request/i.test(String(notification?.message || '')) ? { icon: '♡', label: 'Bearfriend request' } : { icon: '♡', label: 'Friend hello' };
  if (kind === 'photo') return { icon: '▧', label: 'Photo' };
  if (kind === 'song') return { icon: '♫', label: 'Music' };
  if (kind === 'note') return { icon: '✎', label: 'Note' };
  return { icon: '♡', label: 'Activity' };
}

async function markNotificationRead(id) {
  const key = String(id || '');
  const row = notificationRows.find(item => String(item.id) === key);
  if (!row || row.read_at) return true;
  const previous = row.read_at;
  row.read_at = new Date().toISOString();
  updateNotificationBadge();
  if (!$('#notificationGate').classList.contains('hidden')) renderNotifications();
  try {
    await api('/notifications/read', { method: 'PUT', body: JSON.stringify({ ids: [key] }) });
    return true;
  } catch (error) {
    row.read_at = previous;
    updateNotificationBadge();
    if (!$('#notificationGate').classList.contains('hidden')) renderNotifications();
    throw error;
  }
}

function renderNotifications() {
  const list = $('#notificationList');
  if (!list) return;
  const prefs = me?.notification_preferences || {};
  $('#notifyMemories').checked = prefs.memories !== false;
  const soundToggle = $('#notifySounds');
  if (soundToggle) soundToggle.checked = localStorage.getItem('cuteBunnyAppSounds') !== 'off';
  const previousScrollTop = list.scrollTop;
  const visibleRows = notificationRows.filter(notification => !(page === 'notes' && notification.kind === 'note' && !/\bliked your note\b/i.test(String(notification.message || ''))));
  const groups = new Map();
  visibleRows.forEach(notification => {
    const label = notificationGroupLabel(notification.created_at);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(notification);
  });
  const content = ['Today', 'Yesterday', 'Earlier'].filter(label => groups.has(label)).map(label => {
    const rows = groups.get(label).map(n => {
      const actor = Array.isArray(n.actor) ? n.actor[0] : (n.actor || {});
      const unread = !n.read_at;
      const actorName = String(actor.display_name || actor.username || 'Friend');
      const rawMessage = String(n.message || '');
      const likedMatch = rawMessage.match(/\bliked your (photo|song|note)\b/i);
      let actionText = likedMatch ? 'liked your ' + likedMatch[1] : rawMessage;
      if (!likedMatch && actionText.toLowerCase().startsWith(actorName.toLowerCase())) actionText = actionText.slice(actorName.length).trim();
      if (!actionText) actionText = 'shared something with you';
      const meta = notificationKindMeta(n);
      return `<div class="notification-row${unread ? ' is-unread' : ''}" data-notification-row="${esc(n.id)}">
        <button type="button" class="notification-open" data-notification="${esc(n.id)}" aria-label="Open notification from ${esc(actorName)}">
          <span class="notification-avatar" aria-hidden="true">${esc(actor.mascot || meta.icon)}</span>
          <span class="notification-copy"><b>${esc(actorName)}</b><small>${esc(actionText)}</small><time>${esc(formatMessageTime(n.created_at))}</time></span>
          <span class="notification-kind" aria-label="${esc(meta.label)}">${esc(meta.icon)}</span>
          ${unread ? '<i class="notification-unread-dot" aria-label="Unread"></i>' : ''}
        </button>
      </div>`;
    }).join('');
    return `<section class="notification-group"><h3>${label}</h3>${rows}</section>`;
  }).join('');
  list.innerHTML = content || (notificationLoading && !notificationLoaded
    ? '<div class="notification-loading" aria-label="Loading notifications"><span class="notification-loader" aria-hidden="true"></span></div>'
    : '<div class="notification-empty"><span aria-hidden="true">♡</span><b>You’re all caught up</b><small>New shared activity will appear here.</small></div>');
  list.scrollTop = previousScrollTop;
  observeNotificationListRows();
}

function observeNotificationListRows() {
  notificationListSeenObserver?.disconnect();
  notificationListSeenObserver = null;
  const gate = $('#notificationGate'), list = $('#notificationList');
  if (!gate || gate.classList.contains('hidden') || !list || !notificationRows.length) return;
  if (!('IntersectionObserver' in window)) return;

  // Seeing a notification only marks it for dismissal when the user leaves
  // the notification panel. Never remove it while the panel is still open.
  notificationListSeenObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.8) return;
      const id = String(entry.target?.dataset?.notificationRow || '');
      if (id) notificationViewedIds.add(id);
    });
  }, { root: list, threshold: [0, 0.8] });

  list.querySelectorAll('.notification-row[data-notification-row]').forEach(row => {
    notificationListSeenObserver.observe(row);
  });
}

async function dismissViewedNotifications() {
  notificationListSeenObserver?.disconnect();
  notificationListSeenObserver = null;
  const viewedIds = [...notificationViewedIds];
  notificationViewedIds.clear();
  await Promise.all(viewedIds.map(id => dismissNotification(id, { silent: true }).catch(() => false)));
}

async function dismissNotification(id, options = {}) {
  const key = String(id || '');
  if (!key || notificationDismissals.has(key)) return false;
  const index = notificationRows.findIndex(row => String(row.id) === key);
  if (index < 0) return false;

  const row = notificationRows[index];
  const userId = me?.id;
  notificationDismissals.add(key);
  notificationRows.splice(index, 1);
  updateNotificationBadge();
  if (!$('#notificationGate')?.classList.contains('hidden')) renderNotifications();

  try {
    await api('/notifications/' + encodeURIComponent(key), { method: 'DELETE' });
    return true;
  } catch (error) {
    if (me?.id === userId && !notificationRows.some(item => String(item.id) === key)) {
      notificationRows.splice(Math.min(index, notificationRows.length), 0, row);
      updateNotificationBadge();
      if (!$('#notificationGate')?.classList.contains('hidden')) renderNotifications();
    }
    if (!options.silent) toast(error?.message || 'This notification could not be removed yet.');
    throw error;
  } finally {
    notificationDismissals.delete(key);
  }
}

function observeNotificationMemoryViews() {
  // Notifications are no longer auto-dismissed when their linked memory is viewed.
  notificationSeenObserver?.disconnect();
  notificationSeenObserver = null;
}
