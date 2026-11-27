const { query: $, escapeHtml: esc } = window.CuteBunnyCore;
const cfg = window.CUTE_BUNNY_CONFIG || {};

// Keep the expanded player outside the sticky header's backdrop-filter stacking
// context, so it can sample and blur the wallpaper behind the whole panel.
const nowPlayingPanelElement = document.getElementById('nowPlayingPanel');
const appRootElement = document.getElementById('app');
if (nowPlayingPanelElement && appRootElement && nowPlayingPanelElement.parentElement !== appRootElement) {
  appRootElement.appendChild(nowPlayingPanelElement);
}
const sb = window.CuteBunnyServices.createSupabaseClient(window.supabase, cfg);

let token = localStorage.getItem('cuteBunnyToken') || '', me = null, page = 'home', feed = [], friends = [], friendResults = [], friendQuery = '';
const APP_THEMES = Object.freeze(['rose', 'lavender', 'mint', 'sky', 'peach', 'berry', 'midnight', 'sage', 'buttercup']);
let appPageStack = ['home'], appBackGuardInstalled = false, appBackExitArmedUntil = 0, appBackExitPending = false;
let mediaObjectUrls = [], mediaUrlCache = new Map(), mediaHydrationInFlight = new Map(), pendingMediaUrls = new Map();
const memoryLikeInFlight = new Set();
let feedHasMore = false, feedLoadingMore = false;
const FEED_PAGE_SIZE = 40;
const feedPageOffsets = { all: 0, photo: 0, song: 0 };
const feedPageHasMore = { all: false, photo: true, song: true, note: false };
let noteHistoryCursor = null;
const mediaVisibleCount = { photo: 8, song: 8 };
let feedHistoryObserver = null, feedHistoryScrollArmed = false, mediaPageLoading = { photo: false, song: false };
let mediaObserver = null;
let mediaInitialLoaded = { photo: false, song: false };
let pendingDeleteTimers = new Map(), authMode = 'register';
let playlist = [], playlistIndex = -1, audioObjectUrl = '', songLoadSequence = 0;
const songUrlCache = new Map(), songUrlInFlight = new Map();
let notificationRows = [], notificationLoaded = false, notificationLoading = false;
let notificationVisibleCount = 3;
let notificationSeenObserver = null, notificationDismissals = new Set();
let noteSeenObserver = null, noteSeenDebounceTimer = null, seenRelativeInterval = null;
const noteSeenPending = new Map(), noteSeenInFlight = new Map();
let notesIncomingPollTimer = null, notesIncomingPollInFlight = false, lastObservedFriendNoteId = null;
let noteSeenLastAck = new Map();
let notificationListSeenObserver = null, notificationRowViewTimers = new Map();
let notificationViewedIds = new Set();
let navRefreshInFlight = false, appExitStep = 0;
let presenceChannel = null, notificationChannel = null, memoryChannel = null, profileChannel = null, noteReadCursorChannel = null;
let bearRealtimeChannel = null, bearRealtimePartnerChannel = null, bearRealtimeTopic = '', bearRealtimePartnerTopic = '';
let seenStatusRefreshTimer = null, seenStatusRefreshInFlight = false, seenStatusRefreshQueued = false;
let typingHeartbeatTimer = null, typingStopTimer = null, typingActive = false, typingLastSentAt = 0;
let notesTypingChannelReady = false, notesTypingQueuedState = null;
const remoteTypingUsers = new Map();
let activeMessageActionsId = null;
let replyingToMessageId = null;
const noteDeliveryInFlight = new Set();
const noteDeliveredLocally = new Set();
let hiddenNoteIds = new Set();
let homeNavRefreshInFlight = false;
let notesHeaderLastScrollTop = null;
let notesHeaderActivityTimer = null;
let presenceTrackQueue = Promise.resolve();
let lastPublishedPresencePage = null;
let notesActivityChannel = null, notesActivityChannelReady = false;
let pendingNotesPageTransitions = [];
let knownOnlineFriendKeys = new Set(), knownNotesFriendKeys = new Set();
let presenceSnapshotInitialized = false, lastPresenceUiPage = null;
let lastPresenceSweepKey = '', lastPresenceSweepAt = 0;
let notesKeyboardDismissed = false;
let streakSelectedWeekDate = '';
let streakGardenActiveTab = 'daily';
let streakSelectedDailyQuest = 0;
let streakPetalGame = { cards: [], flipped: [], matched: [], moves: 0, locked: false, completed: false, newBest: false };
let cloudPetalPoints = 0, petalPointsSyncInFlight = null;
let kindnessEventStatus = null, kindnessEventStatusUserId = '', kindnessEventStatusLoading = false, kindnessClaimInFlight = false;
let kindnessEventPollInterval = null;
let streakCountdownInterval = null, streakCountdownDayKey = '';
let presenceStatus = 'closed';
let presenceHeartbeatTimer = null, presenceReconnectTimer = null;
let presenceReconnectAttempts = 0, presenceLastSuccessfulTrackAt = 0, presenceClientGeneration = 0;
const PRESENCE_HEARTBEAT_MS = 25000;
const PRESENCE_RECONNECT_BASE_MS = 1500;
const PRESENCE_RECONNECT_MAX_MS = 30000;
let lastActiveWriteAt = 0, lastActiveWriteUserId = '';
let streakRecordInFlight = null, streakRecordInFlightKey = '';
const noteGraphemeSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;
const messagePressState = { timer:null, bubble:null, pointerId:null, startX:0, startY:0, longPressed:false, suppressClick:false, suppressTimer:null };
const photoPressState = { timer:null, image:null, pointerId:null, startX:0, startY:0, suppressClick:false, suppressTimer:null, clickTimer:null, pendingPhotoId:null };
const classicProfilePressState = { timer:null, suppressTimer:null, button:null, pointerId:null, startX:0, startY:0, longPressed:false, suppressClick:false };
const bubbleTapState = { timer:null, bubble:null };
let lastTouchMemoryTap = { id: '', time: 0, tile: null };
let suppressNativeMemoryDblclickUntil = 0;
let suppressPhotoClickUntil = 0;


const kindLines = [
  "Your kindness makes ordinary days brighter.",
  "You make this little world feel warmer.",
  "May today bring you one lovely surprise.",
  "Your smile is a small kind of sunshine.",
  "You deserve the same kindness you give away.",
  "Let yourself enjoy the little things today.",
  "Someone is glad you are part of their world.",
  "You are growing at your own lovely pace.",
  "May your heart feel light and your tea stay warm.",
  "Rest is part of becoming who you want to be.",
  "Your presence makes someone's day softer.",
  "Keep a little room for joy today.",
  "You are worthy of patience and gentle words.",
  "May something beautiful find you today.",
  "You make even quiet moments feel special.",
  "You can begin again as many times as needed.",
  "There is no rush; your pace is enough.",
  "You bring a little brightness wherever you go.",
  "A gentle day can still be a meaningful one.",
  "You deserve moments that feel peaceful and easy."
];

let currentKindnessIndex = new Date().getDate() % kindLines.length;




function setMode(mode) {
  document.body.dataset.mode = mode;
  syncBrowserThemeColor();
  const b = $('#surprise');
  if (b) {
    b.textContent = mode === 'dark' ? '☀' : '☾';
    b.title = mode === 'dark' ? 'Switch to sunshine mode' : 'Switch to moonlight mode';
    b.setAttribute('aria-label', b.title);
  }
  if (me) localStorage.setItem('cuteBunnyMode:' + me.username, mode);
}


const optimizePhotoUpload = window.CuteBunnyServices.optimizePhotoUpload;

async function fetchFriendHeartCounts(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!ids.length) return new Map();
  // Profile hearts are lifetime totals stored separately from memories.
  // Deleting or expiring an old message must never erase hearts it earned.
  const { data, error } = await sb.from('profile_heart_totals')
    .select('user_id,heart_count')
    .in('user_id', ids);
  if (error) {
    console.warn('Persistent profile heart totals could not be loaded:', error.message || error);
    return null;
  }
  const totals = new Map(ids.map(id => [id, 0]));
  (data || []).forEach(row => {
    totals.set(String(row.user_id), Math.max(0, Number(row.heart_count) || 0));
  });
  return totals;
}

const api = window.CuteBunnyServices.createApi({
  client: sb,
  getCurrentUser: () => me,
  fetchFriendHeartCounts,
  themes: APP_THEMES
});

function toast(msg, options = {}) {
  const raw = String(msg ?? '').replace(/\s+/g, ' ').trim(), lower = raw.toLowerCase();
  let message = raw;
  // Status toasts are plain text: remove decorative heart glyphs from every message.
  message = message.replace(/\s*♥\s*/g, ' ').replace(/\s*♡\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (lower.includes('failed to send a request to the edge function')) message = 'Sign-in service unavailable. Try email instead.';
  else if (lower.includes('failed to fetch') || lower.includes('network request failed')) message = 'Could not connect. Check internet and retry.';
  else if (lower.includes('database error saving new user')) message = 'Could not save account. Try another username.';
  else if (lower.includes('duplicate key') || lower.includes('already exists')) message = 'That username or email is already in use.';
  else if (lower.includes('row-level security') || lower.includes('permission denied')) message = 'You do not have permission to do that.';
  if (message.length > 76) message = message.slice(0, 73).trimEnd() + '…';
  let t = $('#toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.append(t);
  }
  t.textContent = message;
  t.setAttribute('role', 'status');
  t.setAttribute('aria-live', 'polite');
  t.classList.add('show');
  clearTimeout(window.cuteToast);
  const duration = Math.max(1400, Math.min(6000, Number(options.duration) || 2800));
  window.cuteToast = setTimeout(() => t.classList.remove('show'), duration);
}

function openAuth(mode = 'register') {
  authMode = mode;
  $('#authGate').classList.remove('hidden');
  $('#authTitle').textContent = mode === 'register' ? 'Create your account' : 'Welcome back ♡';
  $('#authForm .auth-hint').textContent = mode === 'login' ? 'Sign in with your username or email and password.' : 'Create an account with your email, username, and password.';
  $('#authDisplay').closest('label').classList.toggle('hidden', mode === 'login');
  $('#authUser').closest('label').classList.toggle('hidden', mode === 'login');
  $('#authEmail').closest('label').classList.remove('hidden');
  $('#authEmail').required = true;
  $('#authEmail').type = mode === 'login' ? 'text' : 'email';
  $('#authEmail').placeholder = mode === 'login' ? 'Username or email' : 'you@example.com';
  $('#authEmail').closest('label').firstChild.textContent = mode === 'login' ? 'Username or email' : 'Email';
  $('#authPass').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  $('#authSubmit').textContent = mode === 'login' ? 'Sign in ♡' : 'Create account ♡';
  $('#authSwitch').textContent = mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in';
  $('#authError').textContent = '';
}

function syncBrowserThemeColor() {
  const meta = $('meta[name="theme-color"]');
  if (!meta) return;
  const palette = { rose: '#fcf7f2', lavender: '#f7f4fc', mint: '#f3faf4', sky: '#f3f9fc', peach: '#fff7ef', berry: '#fff4f8', midnight: '#f5eff8', sage: '#f2f6ed', buttercup: '#fbf8e9' };
  const activeSurface = getComputedStyle(document.body).getPropertyValue('--cb-bg').trim();
  meta.setAttribute('content', activeSurface || (palette[document.body.dataset.theme] || palette.rose));
}

function setTheme(theme) {
  document.body.dataset.theme = APP_THEMES.includes(theme) ? theme : 'rose';
  syncBrowserThemeColor();
}

function setUser(u) {
  if (me?.id !== u.id) {
    notificationRows = [];
    notificationLoaded = false;
    notificationLoading = false;
  }
  me = u;
  // Hydrate the cloud collection before any shop action can read or write it.
  gardenCollectionHydratedUserId = String(u.id);
  gardenCollectionReadyUserId = '';
  gardenCollectionHydration = hydrateGardenCollectionFromCloud().then(async () => {
    if (String(me?.id || '') !== String(u.id)) return;
    // Recover rewards earned offline/on another device after cloud balance loads.
    const pendingPetalRewards = readPetalRewards();
    if (Object.values(pendingPetalRewards).some(amount => Number(amount) !== 0)) {
      await syncPetalPointsToCloud();
    }
    gardenCollectionReadyUserId = String(u.id);
    const ownPetals = $('#friendProfilePetals');
    if (ownPetals && $('#friendProfileGate')?.dataset.ownProfile === 'true') ownPetals.textContent = petalRewardBalance().toLocaleString();
    if (page === 'streak') renderStreakPage();
  }).catch(error => {
    console.error('Garden collection hydration failed:', error?.message || error);
    if (String(me?.id || '') !== String(u.id)) return;
    gardenCollectionReadyUserId = String(u.id);
    toast('Your garden could not sync. Check your connection and retry.');
    if (page === 'streak') renderStreakPage();
  });
  try {
    const savedHiddenNotes = JSON.parse(localStorage.getItem('cuteBunnyHiddenNotes:' + u.id) || '[]');
    hiddenNoteIds = new Set(Array.isArray(savedHiddenNotes) ? savedHiddenNotes.map(String) : []);
  } catch {
    hiddenNoteIds = new Set();
  }
  try { localStorage.removeItem('cuteBunnyHearts:' + u.username); } catch {}
  setMode(localStorage.getItem('cuteBunnyMode:' + u.username) || 'light');
  setTheme(u.theme);
  $('#topMascot').textContent = u.mascot || '🐰';
  $('#topName').textContent = '@' + u.username;
  $('#authGate').classList.add('hidden');
  $('#welcome').classList.add('hidden');
  $('#app').classList.remove('hidden');
  go('home', { resetStack: true });
  installAppBackNavigation();
  startRealtime();
  void loadKindnessEventStatus();
  if (!kindnessEventPollInterval) kindnessEventPollInterval = window.setInterval(() => { void loadKindnessEventStatus(); }, 30000);
  startStreakCountdown();
  void loadNotifications();
}

async function refresh() {
  const appRoot = $('#app');
  appRoot?.classList.add('app-refreshing');
  appRoot?.setAttribute('aria-busy', 'true');
  try {
    const results = await Promise.all([
      api('/me'),
      api('/feed'),
      api('/following'),
      api('/feed?kind=photo&limit=8').catch(error => { console.warn('Photo warm cache skipped:', error?.message || error); return null; }),
      api('/feed?kind=song&limit=8').catch(error => { console.warn('Music warm cache skipped:', error?.message || error); return null; }),
      api('/notes/my-read-cursors').catch(error => { console.warn('Note read cursors could not be loaded:', error?.message || error); return [] }),
      api('/feed?kind=note&limit=' + FEED_PAGE_SIZE).catch(error => { console.warn('Notes history could not be loaded:', error?.message || error); return [] })
    ]);
    me = results[0];
    // The database profile is the source of truth for the colour palette.
    // Re-apply it on every refresh, not only during the initial session restore.
    setTheme(me?.theme);
    const feedById = new Map();
    [...results[1], ...(results[3] || []), ...(results[4] || []), ...(results[6] || [])].forEach(item => feedById.set(String(item.id), item));
    feed = [...feedById.values()].sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));
    feedPageOffsets.all = results[1].length;
    feedPageHasMore.all = results[1].length === FEED_PAGE_SIZE;
    feedHasMore = feedPageHasMore.all;
    feedPageOffsets.photo = (results[3] || []).length;
    feedPageOffsets.song = (results[4] || []).length;
    mediaInitialLoaded.photo = Array.isArray(results[3]);
    mediaInitialLoaded.song = Array.isArray(results[4]);
    mediaVisibleCount.photo = mediaVisibleCount.song = 8;
    feedPageHasMore.photo = (results[3] || []).length === 8;
    feedPageHasMore.song = (results[4] || []).length === 8;
    const initialNotes = results[6] || [];
    noteHistoryCursor = initialNotes.length ? String(initialNotes[initialNotes.length - 1].id) : null;
    feedPageHasMore.note = initialNotes.length === FEED_PAGE_SIZE;
    friends = results[2];
    startBearRealtime();
    syncPresenceUI();

    noteSeenLastAck = new Map((results[5] || []).map(cursor => [String(cursor.owner_id), Number(cursor.last_read_message_id) || 0]));
    render();
    void markNotesDelivered(feed.filter(item => item.kind === 'note'));
    void refreshOwnNoteSeenStatus();
    // Warm the first gallery photos in the background while the user is on Home.
    // This means opening Photo Garden usually displays cached image bytes immediately.
    void prewarmPhotoSources(feed.filter(item => item.kind === 'photo').slice(0, 16));
    if (page === 'gallery' && !mediaInitialLoaded.photo) void loadLatestMedia('photo');
    else if (page === 'music' && !mediaInitialLoaded.song) void loadLatestMedia('song');
    syncStreakWidget();
    syncPresenceUI();
    if (!$('#friendProfileGate').classList.contains('hidden')) {
      const profile = $('#friendProfileGate').dataset.ownProfile === 'true' ? me : [...friends, ...friendResults].find(user => user.username === $('#friendProfileGate').dataset.username);
      if (profile) showFriendProfile(profile);
    }
  } finally {
    appRoot?.classList.remove('app-refreshing');
    appRoot?.removeAttribute('aria-busy');
  }
}















let feedHistoryTouchY = null;
document.addEventListener('touchstart', event => { feedHistoryTouchY = event.touches?.[0]?.clientY ?? null; }, { passive: true });
window.addEventListener('wheel', event => {
  const towardHistory = page === 'notes' ? event.deltaY < 0 : event.deltaY > 0;
  if (!towardHistory) return;
  if (page === 'notes' && ($('#chatThread')?.scrollTop ?? 1) <= 2) {
    // A wheel-up gesture while the Notes thread is already at its top is an
    // unambiguous request for older messages; load directly instead of
    // depending on IntersectionObserver/viewport geometry.
    feedHistoryScrollArmed = false;
    void loadMoreFeed();
    return;
  }
  feedHistoryScrollArmed = true;
  requestAnimationFrame(tryAutoLoadFeedHistory);
}, { passive: true });
document.addEventListener('touchmove', event => {
  const y = event.touches?.[0]?.clientY;
  if (y == null || feedHistoryTouchY == null) return;
  const fingerDelta = y - feedHistoryTouchY;
  feedHistoryTouchY = y;
  const towardHistory = page === 'notes' ? fingerDelta > 0 : fingerDelta < 0;
  if (towardHistory) { feedHistoryScrollArmed = true; requestAnimationFrame(tryAutoLoadFeedHistory); }
}, { passive: true });
const themeNames = { rose: 'Rose garden', lavender: 'Lavender skies', mint: 'Mint meadow', sky: 'Bluebird day', peach: 'Peach glow', berry: 'Berry bloom', midnight: 'Midnight lilac', sage: 'Sage garden' };
const profileSkinNames = { cat: 'Cat skin', bird: 'Bird skin', vampire: 'Vampire skin', fairy: 'Fairy skin', galaxy: 'Galaxy skin' };

// Let the browser's active locale and device clock preference choose 12-hour or
// 24-hour time. Reuse one formatter instead of constructing it for every row.
const deviceClockFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit'
});
const deviceDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric'
});
































/* Preview-only Petal Points: local, per-account reward ledger. */







let friendGardenRequestSequence = 0;
let gardenCollectionHydratedUserId = '';
let gardenCollectionReadyUserId = '';
let gardenCollectionHydration = Promise.resolve();
let gardenPurchaseInFlight = false;



function friendGardenCollectionCacheKey(userId) {
  return 'cuteBunnyFriendGarden:' + String(userId);
}



let gardenIllustrationSequence = 0;
function gardenIllustration(kind) {
  const art = {
    'pink-tulips':'<path d="M32 53V34m0 12c-12-13-20-5-15 2 5 5 11 3 15-2Zm0-8c12-13 20-5 15 2-5 5-11 3-15-2Z" fill="#91ad83" stroke="#718f70" stroke-width="2"/><path d="M32 34c-13-3-13-18-3-20 0-9 13-9 14 0 10 3 8 18-5 20Z" fill="#e9a1b8" stroke="#bd7895" stroke-width="2"/><path d="M32 34c-7-8-5-16 1-20 7 5 7 13-1 20Z" fill="#f7c7d5"/>',
    'moon-lantern':'<path d="M32 8v8m-12-2h24M23 18h18l-2 29H25Z" fill="#f4d9a5" stroke="#b68d59" stroke-width="2.5"/><path d="M27 23c-3 8 1 15 8 17-8 3-15-3-15-10 0-5 3-8 7-10Z" fill="#fff4ce"/><path d="M22 48h20m-15 5h10" stroke="#b68d59" stroke-width="2" stroke-linecap="round"/>',
    'tiny-mushroom':'<path d="M17 34c0-13 8-23 17-23s17 10 17 23Z" fill="#e99aac" stroke="#b9798e" stroke-width="2.5"/><path d="M29 34v17c0 5 12 5 12 0V34Z" fill="#fff0df" stroke="#c8a98d" stroke-width="2"/><circle cx="26" cy="24" r="3" fill="#fff2e8"/><circle cx="41" cy="18" r="2.5" fill="#fff2e8"/><circle cx="44" cy="29" r="2" fill="#fff2e8"/>',
    'golden-bell':'<path d="M19 43c5-6 3-23 13-23s8 17 13 23Z" fill="#f2d17d" stroke="#b9954f" stroke-width="2.5"/><path d="M16 44h32m-18-27a2 2 0 1 1 4 0" stroke="#b9954f" stroke-width="2.5" stroke-linecap="round"/><circle cx="32" cy="48" r="4" fill="#d6a95b"/><path d="m14 17 4 3m32-3-4 3" stroke="#e0bd71" stroke-width="2.5" stroke-linecap="round"/>',
    'bunny-bow':'<path d="M31 32C14 9 7 24 22 36L31 32Zm2 0c17-23 24-8 9 4l-9-4Z" fill="#e99bb7" stroke="#b97896" stroke-width="2.5"/><circle cx="32" cy="33" r="5" fill="#f6d4df" stroke="#b97896" stroke-width="2"/>',
    'flower-crown':'<path d="M12 42c5-22 35-22 40 0" fill="none" stroke="#8eaa7d" stroke-width="4" stroke-linecap="round"/><g stroke="#b97998" stroke-width="1.5"><circle cx="17" cy="32" r="6" fill="#f2b2c5"/><circle cx="28" cy="25" r="7" fill="#f6d9a4"/><circle cx="42" cy="31" r="6" fill="#d9c8ee"/></g><g fill="#fff3e6"><circle cx="17" cy="32" r="2"/><circle cx="28" cy="25" r="2.2"/><circle cx="42" cy="31" r="2"/></g>',
    'starry-hat':'<path d="M15 42 27 12c2-5 8-5 10 0l12 30Z" fill="#b7a3d7" stroke="#8873ad" stroke-width="2.5"/><path d="M12 43h40" stroke="#8873ad" stroke-width="4" stroke-linecap="round"/><path d="m31 20 2 4 4 1-4 2-2 4-2-4-4-2 4-1Z" fill="#ffe6a6"/><circle cx="40" cy="34" r="2" fill="#fff1cf"/>',
    'hearts':'<path d="M32 49S12 37 12 24c0-10 14-13 20-2 6-11 20-8 20 2 0 13-20 25-20 25Z" fill="#e99bb7" stroke="#b97896" stroke-width="2.5"/><path d="m19 20 3-4m23 4-3-4" stroke="#fff0e6" stroke-width="2.5" stroke-linecap="round"/>',
    'photo':'<rect x="12" y="17" width="40" height="31" rx="6" fill="#f8e5d6" stroke="#b98b78" stroke-width="2.5"/><circle cx="24" cy="27" r="4" fill="#efc879"/><path d="m15 43 12-12 8 8 6-6 8 10" fill="#a9c49b" stroke="#789477" stroke-width="2"/>',
    'kissNote':'<path d="M13 19h38v29H13Z" fill="#fff1e8" stroke="#c98da8" stroke-width="2.5"/><path d="m14 21 18 14 18-14" fill="none" stroke="#c98da8" stroke-width="2.5"/><path d="M32 30c-7-9-16 0 0 12 16-12 7-21 0-12Z" fill="#e99bb7"/>',
    'note':'<path d="M17 12h30v39H17Z" fill="#fff8ec" stroke="#c5a98b" stroke-width="2.5"/><path d="M23 23h18m-18 7h18m-18 7h12" stroke="#c98da8" stroke-width="2.5" stroke-linecap="round"/>',
    'song':'<path d="M35 12v29a7 7 0 1 1-5-6V18l20-4v23a7 7 0 1 1-5-6V10Z" fill="#c9b8e4" stroke="#8d79ae" stroke-width="2.5"/>',
    'login':'<path d="M32 50V27m0 14c-17-19-25-7-16 1 5 4 11 2 16-1Zm0-11c14-16 23-5 15 2-5 4-10 2-15-2Z" fill="#a8c49a" stroke="#789477" stroke-width="2"/><path d="M32 27c-13-3-13-17-3-19 0-8 13-8 14 0 10 3 8 16-5 19Z" fill="#e9a1b8" stroke="#bd7895" stroke-width="2"/>',
    'bloom-3':'<path d="M32 51V35m0 9c-12-12-18-4-13 2 4 4 9 2 13-2Z" stroke="#789477" stroke-width="2.5" fill="#b6cba9"/><g fill="#e9a1b8"><ellipse cx="32" cy="22" rx="6" ry="11"/><ellipse cx="32" cy="22" rx="6" ry="11" transform="rotate(72 32 22)"/><ellipse cx="32" cy="22" rx="6" ry="11" transform="rotate(144 32 22)"/></g><circle cx="32" cy="22" r="5" fill="#f4d17d"/>',
    'bloom-5':'<path d="M32 54V32m0 13c-14-13-22-5-15 3 5 4 11 2 15-3Z" stroke="#789477" stroke-width="2.5" fill="#b6cba9"/><g fill="#e9a1b8"><ellipse cx="32" cy="20" rx="6" ry="12"/><ellipse cx="32" cy="20" rx="6" ry="12" transform="rotate(60 32 20)"/><ellipse cx="32" cy="20" rx="6" ry="12" transform="rotate(120 32 20)"/></g><circle cx="32" cy="20" r="5" fill="#f4d17d"/><path d="M14 14 17 9m30 5-3-5" stroke="#d5b16b" stroke-width="2"/>',
    'bloom-7':'<path d="M32 55V32m0 15c-14-14-22-5-15 3 5 4 11 2 15-3Z" stroke="#789477" stroke-width="2.5" fill="#b6cba9"/><g fill="#e99bb7" stroke="#c47e9c" stroke-width="1"><ellipse cx="32" cy="19" rx="6" ry="13"/><ellipse cx="32" cy="19" rx="6" ry="13" transform="rotate(45 32 19)"/><ellipse cx="32" cy="19" rx="6" ry="13" transform="rotate(90 32 19)"/><ellipse cx="32" cy="19" rx="6" ry="13" transform="rotate(135 32 19)"/></g><circle cx="32" cy="19" r="6" fill="#f4d17d"/><path d="m13 17 3-5m35 5-3-5" stroke="#d5b16b" stroke-width="2"/>',
    'crystal-dew':'<path d="M32 8 49 28 32 56 15 28Z" fill="#c9e9f4" stroke="#78b6c9" stroke-width="2.5"/><path d="m32 8 1 48M15 28h34M32 8 23 28l9 28 9-28Z" fill="#f6ffff" fill-opacity=".48" stroke="#fff" stroke-width="1.4"/><path d="m12 13 3-6 3 6 6 3-6 3-3 6-3-6-6-3Zm39 31 2-4 2 4 4 2-4 2-2 4-2-4-4-2Z" fill="#fff0b8"/>',
    'aurora-fountain':'<path d="M13 43h38l-5 12H18Z" fill="#b9a5dc" stroke="#8874b5" stroke-width="2.5"/><path d="M19 42c-7-11 1-19 7-10 2-16 13-17 14-1 8-7 13 3 5 11" fill="none" stroke="#8ed8d0" stroke-width="4" stroke-linecap="round"/><path d="M26 40c-4-10 2-17 7-10 2-11 9-10 10 0" fill="none" stroke="#d4b7f4" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="18" r="4" fill="#fff0b8"/><path d="m12 18 2-5 2 5 5 2-5 2-2 5-2-5-5-2Zm38 4 2-4 2 4 4 2-4 2-2 4-2-4-4-2Z" fill="#fff"/>',
    'moon-bunny-hood':'<path d="M20 43 15 13c-1-8 8-10 12-2l5 12 5-12c4-8 13-6 12 2l-5 30Z" fill="#b9a9e5" stroke="#8977b5" stroke-width="2.5"/><path d="M22 39c4-10 16-14 25-3l-4 12H24Z" fill="#f7eafa" stroke="#b49bcf" stroke-width="2"/><path d="M28 39q4-4 8 0m-8 5h8" fill="none" stroke="#a47eaa" stroke-width="2" stroke-linecap="round"/><path d="m35 12 2 4 4 1-4 2-2 4-2-4-4-2 4-1Z" fill="#fff0b8"/>',
    'celestial-rose':'<defs><linearGradient id="rosePetal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe0ed"/><stop offset=".38" stop-color="#f06b9c"/><stop offset=".76" stop-color="#c72f68"/><stop offset="1" stop-color="#7f214e"/></linearGradient><linearGradient id="roseLeaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c9e7b5"/><stop offset="1" stop-color="#477c68"/></linearGradient><radialGradient id="roseCore"><stop stop-color="#fff2c9"/><stop offset=".55" stop-color="#f7c77d"/><stop offset="1" stop-color="#d88c68"/></radialGradient></defs><circle cx="32" cy="27" r="25" fill="#f47da9" opacity=".13"/><path d="M32 58V31" stroke="#5e8c70" stroke-width="3" stroke-linecap="round"/><path d="M31 49C12 34 7 49 19 53c5 2 9-1 12-4Zm2-8c18-16 24-2 13 5-5 3-10 0-13-5Z" fill="url(#roseLeaf)" stroke="#527e68" stroke-width="1.5"/><g fill="url(#rosePetal)" stroke="#a63a69" stroke-width="1.15"><ellipse cx="32" cy="23" rx="7.5" ry="17"/><ellipse cx="32" cy="23" rx="7.5" ry="17" transform="rotate(45 32 23)"/><ellipse cx="32" cy="23" rx="7.5" ry="17" transform="rotate(90 32 23)"/><ellipse cx="32" cy="23" rx="7.5" ry="17" transform="rotate(135 32 23)"/></g><g fill="#ffb4d0" stroke="#c64c7d" stroke-width="1"><ellipse cx="32" cy="23" rx="5.2" ry="11.5" transform="rotate(22 32 23)"/><ellipse cx="32" cy="23" rx="5.2" ry="11.5" transform="rotate(82 32 23)"/><ellipse cx="32" cy="23" rx="5.2" ry="11.5" transform="rotate(142 32 23)"/></g><path d="M28 24c-1-5 6-8 9-3 2 4-2 8-6 8-4 0-6-4-3-7 2-2 5-1 5 1" fill="none" stroke="#ffe3a9" stroke-width="2.2" stroke-linecap="round"/><circle cx="32" cy="23" r="3.2" fill="url(#roseCore)"/><g fill="#fff4f8"><path d="m10 17 2-5 2 5 5 2-5 2-2 5-2-5-5-2Zm43 17 1.7-4 1.7 4 4 1.7-4 1.7-1.7 4-1.7-4-4-1.7Z"/><circle cx="49" cy="9" r="1.5"/><circle cx="14" cy="39" r="1.2"/></g>',
    'divine-lotus':'<defs><radialGradient id="lotusAura"><stop stop-color="#f47da9" stop-opacity=".48"/><stop offset=".52" stop-color="#f47da9" stop-opacity=".28"/><stop offset=".82" stop-color="#f47da9" stop-opacity=".12"/><stop offset="1" stop-color="#f47da9" stop-opacity="0"/></radialGradient><linearGradient id="lotusOuter" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#fff0f6"/><stop offset=".3" stop-color="#ffb1ce"/><stop offset=".68" stop-color="#ed659b"/><stop offset="1" stop-color="#ad2e68"/></linearGradient><linearGradient id="lotusInnerPink" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff3f9"/><stop offset=".42" stop-color="#f8a6ca"/><stop offset="1" stop-color="#d94f91"/></linearGradient><linearGradient id="lotusInnerBlue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4f0ff"/><stop offset=".42" stop-color="#b9b8f1"/><stop offset="1" stop-color="#777bc9"/></linearGradient><linearGradient id="lotusInnerPurple" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0fb"/><stop offset=".42" stop-color="#d8b1ee"/><stop offset="1" stop-color="#9869c4"/></linearGradient><linearGradient id="lotusLeaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c5e9b7"/><stop offset=".48" stop-color="#83bb8b"/><stop offset="1" stop-color="#477d65"/></linearGradient><radialGradient id="lotusSeed"><stop stop-color="#fff4c9"/><stop offset=".55" stop-color="#f5c873"/><stop offset="1" stop-color="#c9824f"/></radialGradient><filter id="lotusGlow" x="-95%" y="-85%" width="290%" height="270%"><feGaussianBlur in="SourceAlpha" stdDeviation="4.8" result="blur"/><feFlood flood-color="#ff6fa8" flood-opacity=".96" result="pink"/><feComposite in="pink" in2="blur" operator="in" result="pinkGlow"/><feMerge><feMergeNode in="pinkGlow"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="lotusInnerPinkGlow" x="-100%" y="-90%" width="300%" height="280%"><feGaussianBlur in="SourceAlpha" stdDeviation="3.8" result="blur"/><feFlood flood-color="#ff9ac7" flood-opacity=".95" result="light"/><feComposite in="light" in2="blur" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="lotusInnerBlueGlow" x="-100%" y="-90%" width="300%" height="280%"><feGaussianBlur in="SourceAlpha" stdDeviation="3.8" result="blur"/><feFlood flood-color="#aaaaff" flood-opacity=".98" result="light"/><feComposite in="light" in2="blur" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="lotusInnerPurpleGlow" x="-100%" y="-90%" width="300%" height="280%"><feGaussianBlur in="SourceAlpha" stdDeviation="3.8" result="blur"/><feFlood flood-color="#d4a0ff" flood-opacity=".98" result="light"/><feComposite in="light" in2="blur" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><ellipse cx="32" cy="28" rx="33" ry="31" fill="url(#lotusAura)"/><ellipse cx="32" cy="53" rx="27" ry="6" fill="#9bd3ae" opacity=".62"/><path d="M32 49C13 36 4 43 13 50c6 5 13 3 19-1Zm0 0c19-13 28-6 19 1-6 5-13 3-19-1Z" fill="url(#lotusLeaf)" stroke="#477d65" stroke-width="1.7"/><path d="M32 49c-8-7-17-7-21-2 8 1 14 3 21 2Zm0 0c8-7 17-7 21-2-8 1-14 3-21 2Z" fill="#b4dfa9" opacity=".9"/><g filter="url(#lotusGlow)"><g fill="url(#lotusOuter)" stroke="#a33368" stroke-width="1.15"><path d="M32 42C22 32 19 17 32 5c13 12 10 27 0 37Z"/><path d="M30 43C15 37 8 25 14 13c13 5 20 17 16 30Z"/><path d="M34 43c15-6 22-18 16-30-13 5-20 17-16 30Z"/><path d="M29 44C12 43 5 34 7 25c13 1 22 8 22 19Z"/><path d="M35 44c17-1 24-10 22-19-13 1-22 8-22 19Z"/></g></g><g filter="url(#lotusInnerGlow)"><path filter="url(#lotusInnerBlueGlow)" d="M32 42C24 32 24 19 32 11c8 8 8 21 0 31Z" fill="url(#lotusInnerBlue)" stroke="#7776bd" stroke-width="1.1"/><path filter="url(#lotusInnerPinkGlow)" d="M30 43C20 36 18 27 23 19c9 7 12 15 7 24Z" fill="url(#lotusInnerPink)" stroke="#c56c9c" stroke-width="1.05"/><path filter="url(#lotusInnerPurpleGlow)" d="M34 43c10-7 12-16 7-24-9 7-12 15-7 24Z" fill="url(#lotusInnerPurple)" stroke="#9a70c2" stroke-width="1.05"/></g><g fill="none" stroke="#fff7fc" stroke-linecap="round" opacity=".72"><path d="M32 15c4 7 4 15 1 22" stroke-width="1.1"/><path d="M24 23c4 5 6 10 5 15" stroke-width=".9"/><path d="M40 23c-4 5-6 10-5 15" stroke-width=".9"/></g><ellipse cx="32" cy="39" rx="7" ry="5" fill="url(#lotusSeed)" stroke="#b87543" stroke-width="1"/><g fill="#87502e"><circle cx="28" cy="38" r=".8"/><circle cx="32" cy="37" r=".8"/><circle cx="36" cy="38" r=".8"/><circle cx="30" cy="41" r=".8"/><circle cx="34" cy="41" r=".8"/></g><g fill="#fff7fc"><path d="m10 17 2-5 2 5 5 2-5 2-2 5-2-5-5-2Zm43 5 1.5-3.5L56 22l3.5 1.5L56 25l-1.5 3.5L53 25l-1.5-3.5L56 22Z"/><circle cx="49" cy="10" r="1.4"/></g>',


    'moonlit-orchid':`<defs>
<radialGradient id="moHalo"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="#e7c6ff" stop-opacity=".7"/><stop offset="1" stop-color="#a66be8" stop-opacity="0"/></radialGradient>
<linearGradient id="moPetal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".22" stop-color="#f2dfff"/><stop offset=".58" stop-color="#bb8df4"/><stop offset="1" stop-color="#7043b1"/></linearGradient>
<linearGradient id="moGold"><stop stop-color="#fff6cb"/><stop offset=".45" stop-color="#f4cb72"/><stop offset="1" stop-color="#b97837"/></linearGradient>
<linearGradient id="moMoon"><stop stop-color="#fff"/><stop offset=".55" stop-color="#fff0bd"/><stop offset="1" stop-color="#e9a6d5"/></linearGradient>
<filter id="moGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.8" result="b"/><feFlood flood-color="#c58cff" flood-opacity="1"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<circle cx="32" cy="31" r="31" fill="url(#moHalo)"/>
<path d="M48 7A22 22 0 1 0 56 39 19 19 0 1 1 48 7Z" fill="url(#moMoon)" stroke="#d5a5df" stroke-width="1" filter="url(#moGlow)"/>
<g class="mo-orchid-petals" fill="url(#moPetal)" stroke="#9163c3" stroke-width="1.1" filter="url(#moGlow)">
<path d="M31 37C14 31 13 17 22 15c7-2 10 10 9 22Z"/>
<path d="M31 37C14 31 13 17 22 15c7-2 10 10 9 22Z" transform="rotate(60 32 34)"/>
<path d="M31 37C14 31 13 17 22 15c7-2 10 10 9 22Z" transform="rotate(120 32 34)"/>
<path d="M31 37C14 31 13 17 22 15c7-2 10 10 9 22Z" transform="rotate(180 32 34)"/>
<path d="M31 37C14 31 13 17 22 15c7-2 10 10 9 22Z" transform="rotate(240 32 34)"/>
<path d="M31 37C14 31 13 17 22 15c7-2 10 10 9 22Z" transform="rotate(300 32 34)"/>
</g>
<g fill="none" stroke="#fff" stroke-width="1.2" opacity=".95"><path d="M32 35 22 20m10 15 12-14m-12 14 0-18m0 18-14 3m14-3 13 7"/></g>
<circle cx="32" cy="34" r="8" fill="url(#moGold)" stroke="#b67b42" stroke-width="1.3"/>
<path d="M32 28c-5 5-5 9 0 13 5-4 5-8 0-13Z" fill="#fff4c9" stroke="#fff" stroke-width=".8"/>
<path d="M32 42c-10 8-15 3-16 12m16-9c10 8 15 3 16 12" fill="none" stroke="#82b58c" stroke-width="2" stroke-linecap="round"/>
<g fill="#fff"><path d="m9 16 2-5 2 5 5 2-5 2-2 5-2-5-5-2Zm43 27 1.7-4 1.7 4 4 1.7-4 1.7-1.7 4-1.7-4-4-1.7Z"/><path d="m19 7 1.3-3 1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3Z"/><circle cx="12" cy="48" r="1.4"/><circle cx="52" cy="12" r="1.2"/></g>`,
    'crystal-butterfly':`<defs>
<radialGradient id="cbHalo"><stop stop-color="#eaffff" stop-opacity=".95"/><stop offset=".5" stop-color="#86e9f2" stop-opacity=".48"/><stop offset="1" stop-color="#8f9dff" stop-opacity="0"/></radialGradient>
<linearGradient id="cbA" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".28" stop-color="#bffff5"/><stop offset=".68" stop-color="#56d4dc"/><stop offset="1" stop-color="#4380c5"/></linearGradient>
<linearGradient id="cbB" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".4" stop-color="#e1caff"/><stop offset=".8" stop-color="#a58af0"/><stop offset="1" stop-color="#6959b9"/></linearGradient>
<linearGradient id="cbBody" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fff"/><stop offset=".5" stop-color="#f6d58a"/><stop offset="1" stop-color="#fff"/></linearGradient>
<filter id="cbGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"/><feFlood flood-color="#83ecff" flood-opacity="1"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<circle cx="32" cy="31" r="31" fill="url(#cbHalo)"/>
<circle cx="32" cy="31" r="26" fill="none" stroke="#fff" stroke-width=".8" stroke-dasharray="1 3" opacity=".8"/>
<g filter="url(#cbGlow)" stroke="#8ccbd9" stroke-width="1.1" stroke-linejoin="round">
<g class="cb-left-wings">
<path d="M29 29C22 5 6 4 5 18c-1 12 10 23 25 23-5-8-7-16-8-23 4 3 6 7 7 11Z" fill="url(#cbA)"/>
<path d="M28 37C12 27 4 40 13 51c6 7 15 4 19-7-5-1-7-3-4-7Z" fill="url(#cbB)"/>
</g>
<g class="cb-right-wings">
<path d="M35 29C42 5 58 4 59 18c1 12-10 23-25 23 5-8 7-16 8-23-4 3-6 7-7 11Z" fill="url(#cbB)"/>
<path d="M36 37c16-10 24 3 15 14-6 7-15 4-19-7 5-1 7-3 4-7Z" fill="url(#cbA)"/>
</g>
</g>
<g fill="none" stroke="#fff" stroke-width="1.25" stroke-linecap="round"><path d="M29 33 10 14m19 25L13 45m22-12 19-19M36 39l16 6M29 34 17 23m18 11 12-11"/><path d="M29 28 18 13m17 15 11-15" opacity=".7"/></g>
<g fill="none" stroke="#fff" stroke-width=".8"><path d="M9 20q8-10 17 5m-12 9q8-5 14 4m27-18q-8-10-17 5m12 9q-8-5-14 4" opacity=".9"/></g>
<path d="M30 25q-8-13-11-8m15 8q8-13 11-8" fill="none" stroke="#e9d7ff" stroke-width="1.6" stroke-linecap="round"/>
<path d="M32 24c-4 8-4 17 0 26 4-9 4-18 0-26Z" fill="url(#cbBody)" stroke="#a7c6d6" stroke-width="1.2"/>
<path d="M32 29 27 35l5 7 5-7Z" fill="#fff" stroke="#69cbd8" stroke-width="1.1"/>
<circle cx="32" cy="35" r="2.5" fill="#8deaf0" stroke="#fff" stroke-width="1"/>
<g fill="#fff"><path d="m8 9 1.5-4L11 9l4 1.5-4 1.5-1.5 4L8 12l-4-1.5Zm47 33 1.5-4 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5Z"/><circle cx="14" cy="52" r="1.5"/><circle cx="49" cy="9" r="1.3"/><circle cx="52" cy="25" r="1"/></g>`,
    'sunfire-blossom':`<defs>
<radialGradient id="sfHalo"><stop stop-color="#fff9d9" stop-opacity=".98"/><stop offset=".38" stop-color="#ffc76d" stop-opacity=".56"/><stop offset="1" stop-color="#f47b52" stop-opacity="0"/></radialGradient>
<linearGradient id="sfFlame" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fffde8"/><stop offset=".3" stop-color="#ffe28a"/><stop offset=".7" stop-color="#ff9b50"/><stop offset="1" stop-color="#db4d68"/></linearGradient>
<linearGradient id="sfGold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff9d5"/><stop offset=".5" stop-color="#ffc85f"/><stop offset="1" stop-color="#c87834"/></linearGradient>
<filter id="sfGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4.5" result="b"/><feFlood flood-color="#ffad53" flood-opacity="1"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<circle cx="32" cy="30" r="31" fill="url(#sfHalo)"/>
<g class="sf-sun-rotor" filter="url(#sfGlow)" stroke="#d88743" stroke-width=".9">
<path d="M32 3 37 17 49 8 45 23 61 25 47 34 57 47 41 43 39 60 31 46 21 59 22 43 6 47 17 34 3 25 19 23 15 8 27 17Z" fill="url(#sfFlame)" opacity=".95"/>
</g>
<g filter="url(#sfGlow)"><circle cx="32" cy="30" r="17" fill="url(#sfGold)" stroke="#fff0b0" stroke-width="1.5"/></g>
<g fill="none" stroke="#fff9d8" stroke-width="1.2" opacity=".9"><path d="M32 8v8m0 28v9M10 30h8m28 0h8M16 14l6 6m20 20 6 6m0-32-6 6M22 40l-6 6"/><circle cx="32" cy="30" r="12" stroke-dasharray="2 2"/></g>
<path d="M32 18c-8 9-7 18 0 25 7-7 8-16 0-25Z" fill="#fff6cf" stroke="#e5a34e" stroke-width="1.1"/>
<path d="M32 24c-4 6-3 11 0 15 3-4 4-9 0-15Z" fill="#ffb55f"/>
<path d="M23 45c-2 7-8 9-13 7 6 0 8-5 8-10m29 3c2 7 8 9 13 7-6 0-8-5-8-10" fill="none" stroke="#ef9855" stroke-width="2" stroke-linecap="round"/>
<g fill="#fff"><path d="m8 15 1.6-4 1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6Zm43 26 1.5-3.8 1.5 3.8 3.8 1.5-3.8 1.5-1.5 3.8-1.5-3.8-3.8-1.5Z"/><circle cx="18" cy="7" r="1.5"/><circle cx="48" cy="12" r="1.4"/><circle cx="13" cy="48" r="1.2"/></g>`,

    'dreamwing-halo':`<defs>
<radialGradient id="dwAura"><stop stop-color="#ffb5df" stop-opacity=".72"/><stop offset=".48" stop-color="#c9a4ff" stop-opacity=".34"/><stop offset="1" stop-color="#c9a4ff" stop-opacity="0"/></radialGradient>
<linearGradient id="dwPink" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffaff"/><stop offset=".3" stop-color="#ffd4ed"/><stop offset=".68" stop-color="#f18acb"/><stop offset="1" stop-color="#a653ad"/></linearGradient>
<linearGradient id="dwLilac" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffaff"/><stop offset=".36" stop-color="#e5d8ff"/><stop offset=".74" stop-color="#ad9af1"/><stop offset="1" stop-color="#7162b9"/></linearGradient>
<linearGradient id="dwGold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff7d8"/><stop offset=".55" stop-color="#e8bd77"/><stop offset="1" stop-color="#a97847"/></linearGradient>
<radialGradient id="dwHeart"><stop stop-color="#fff"/><stop offset=".42" stop-color="#ffe0f2"/><stop offset="1" stop-color="#d65fa8"/></radialGradient>
<filter id="dwGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur"/><feFlood flood-color="#ff83ca" flood-opacity="1" result="pink"/><feComposite in="pink" in2="blur" operator="in" result="halo"/><feMerge><feMergeNode in="halo"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="dwInnerGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceAlpha" stdDeviation="3.4" result="blur"/><feFlood flood-color="#ffd0f0" flood-opacity="1" result="light"/><feComposite in="light" in2="blur" operator="in" result="halo"/><feMerge><feMergeNode in="halo"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<circle cx="32" cy="31" r="30" fill="url(#dwAura)" class="dw-aura"/>
<circle cx="32" cy="31" r="23" fill="none" stroke="#fff4ff" stroke-opacity=".32" stroke-width=".7" stroke-dasharray="1.5 3"/>
<g class="dw-wings" filter="url(#dwGlow)" stroke="#a65d9f" stroke-width="1.05" stroke-linejoin="round">
<path class="dw-wing dw-wing-left" d="M29 32C24 17 14 7 8 13 1 21 8 38 28 42c-5-8-6-16-8-23 5 5 8 10 9 16Z" fill="url(#dwPink)"/>
<path class="dw-wing dw-wing-left-lower" d="M28 37C17 32 8 35 10 46c2 9 13 11 22 1-4-3-6-6-4-10Z" fill="url(#dwLilac)"/>
<path class="dw-wing dw-wing-right" d="M35 32C40 17 50 7 56 13c7 8 0 25-20 29 5-8 6-16 8-23-5 5-8 10-9 16Z" fill="url(#dwLilac)"/>
<path class="dw-wing dw-wing-right-lower" d="M36 37c11-5 20-2 18 9-2 9-13 11-22 1 4-3 6-6 4-10Z" fill="url(#dwPink)"/>
</g>
<g class="dw-wing-jewels" fill="none" stroke="#fffaff" stroke-width=".9">
<path d="M9 18q8-8 16 8m-13 7q7-2 14 7m28-22q-8-8-16 8m13 7q-7-2-14 7" opacity=".85"/>
<path d="M12 22q5-2 9 5m31-5q-5-2-9 5" stroke="#fff" stroke-width="1.4"/>
<circle cx="15" cy="20" r="2.2" fill="#fff0fa" stroke="#e78cc8"/><circle cx="49" cy="20" r="2.2" fill="#f3eaff" stroke="#a99ae9"/>
<circle cx="17" cy="42" r="1.7" fill="#fff0fa"/><circle cx="47" cy="42" r="1.7" fill="#fff0fa"/>
</g>
<g class="dw-veins" fill="none" stroke="#fff8ff" stroke-width="1.05" stroke-linecap="round" opacity=".96">
<path d="M29 34 10 16m18 23L11 43m18-8L18 23m17 11 19-18M36 39l17 4M36 35l11-12"/>
<path d="M12 27c5 1 9 5 12 10m28-10c-5 1-9 5-12 10"/>
</g>
<g class="dw-center" filter="url(#dwInnerGlow)">
<path d="M32 15c-5 5-6 11 0 17 6-6 5-12 0-17Z" fill="url(#dwGold)" stroke="#b47c4a" stroke-width="1.2"/>
<path d="M32 26c-8-8-15 2-7 10l7 8 7-8c8-8 1-18-7-10Z" fill="url(#dwHeart)" stroke="#c36a9e" stroke-width="1.35"/>
<path d="m32 28 0 12m-5-9 5 4 5-4" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
<path d="M27 46q5 4 10 0" fill="none" stroke="url(#dwGold)" stroke-width="2.2" stroke-linecap="round"/>
<circle cx="32" cy="34" r="1.5" fill="#fff"/>
</g>
<g class="dw-sparkles" fill="#fffaff">
<path d="m7 12 2-5 2 5 5 2-5 2-2 5-2-5-5-2Zm48 28 1.6-4 1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6Z"/>
<path d="m18 7 1.2-3 1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2Zm27 4 1.3-3.2 1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3Z"/>
<circle cx="12" cy="53" r="1.4"/><circle cx="51" cy="52" r="1.2"/><circle cx="32" cy="8" r="1.1"/>
</g>`,



  };
  const prefix = 'garden-art-' + (++gardenIllustrationSequence) + '-';
  const illustration = (art[kind] || art['pink-tulips'])
    .replace(/id="([^"]+)"/g, 'id="' + prefix + '$1"')
    .replace(/url\(#([^\)]+)\)/g, 'url(#' + prefix + '$1)');
  return '<svg viewBox="0 0 64 64" role="img" focusable="false" aria-hidden="true">' + illustration + '</svg>';
}

const GARDEN_COLLECTIBLES = [
  {id:'pink-tulips',name:'Pink Tulips',art:gardenIllustration('pink-tulips'),cost:30,type:'garden',rarity:'common'},
  {id:'moon-lantern',name:'Moon Lantern',art:gardenIllustration('moon-lantern'),cost:45,type:'garden',rarity:'common'},
  {id:'tiny-mushroom',name:'Tiny Mushroom',art:gardenIllustration('tiny-mushroom'),cost:60,type:'garden',rarity:'common'},
  {id:'golden-bell',name:'Golden Bell',art:gardenIllustration('golden-bell'),cost:80,type:'garden',rarity:'rare'},
  {id:'bunny-bow',name:'Blush Bow',art:gardenIllustration('bunny-bow'),cost:35,type:'bunny',rarity:'common'},
  {id:'flower-crown',name:'Flower Crown',art:gardenIllustration('flower-crown'),cost:65,type:'bunny',rarity:'rare'},
  {id:'starry-hat',name:'Starry Hat',art:gardenIllustration('starry-hat'),cost:90,type:'bunny',rarity:'rare'},
  {id:'crystal-dew',name:'Crystal Dew',art:gardenIllustration('crystal-dew'),cost:120,type:'garden',rarity:'rare'},
  {id:'aurora-fountain',name:'Aurora Fountain',art:gardenIllustration('aurora-fountain'),cost:180,type:'garden',rarity:'epic'},
  {id:'moon-bunny-hood',name:'Moon Hood',art:gardenIllustration('moon-bunny-hood'),cost:220,type:'bunny',rarity:'epic'},
  {id:'celestial-rose',name:'Celestial Rose',art:gardenIllustration('celestial-rose'),cost:350,type:'garden',rarity:'legendary'},
  {id:'divine-lotus',name:'Divine Lotus',art:gardenIllustration('divine-lotus'),cost:350,type:'garden',rarity:'legendary'},
  {id:'dreamwing-halo',name:'Dreamwing Halo',art:gardenIllustration('dreamwing-halo'),cost:400,type:'bunny',rarity:'legendary'},
  {id:'moonlit-orchid',name:'Moonlit Orchid',art:gardenIllustration('moonlit-orchid'),cost:500,type:'garden',rarity:'legendary'},
  {id:'crystal-butterfly',name:'Crystal Butterfly',art:gardenIllustration('crystal-butterfly'),cost:500,type:'garden',rarity:'legendary'},
  {id:'sunfire-blossom',name:'Sunfire Blossom',art:gardenIllustration('sunfire-blossom'),cost:500,type:'garden',rarity:'legendary'},
];









window.addEventListener('cute-bunny:bear-action', event => {
  const action = String(event?.detail?.action || '');
  if (action) recordStreakDailyQuest('bear-action', {
    action,
    actionId: String(event?.detail?.actionId || '')
  });
});





























const STREAK_MILESTONE_ILLUSTRATIONS = [
  // Day 3 — a new seedling pushing through the soil.
  '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M15 77q35-10 70 0" fill="none" stroke="#c6a17b" stroke-width="4" stroke-linecap="round"/><path d="M50 75V43" stroke="#648f6a" stroke-width="4" stroke-linecap="round"/><path d="M50 53C29 32 18 47 29 57c7 6 14 2 21-4Z" fill="#a9c99a" stroke="#648f6a" stroke-width="1.5"/><path d="M50 45C68 26 81 39 72 49c-6 6-14 3-22-4Z" fill="#c2d9a7" stroke="#648f6a" stroke-width="1.5"/><path d="M50 42c-8-9-6-20 0-27 8 8 9 18 0 27Z" fill="#8fb47f"/><circle cx="50" cy="13" r="3" fill="#f2d17d"/></svg>',
  // Day 7 — a single daisy in its first full bloom.
  '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 78V39" stroke="#648f6a" stroke-width="4" stroke-linecap="round"/><path d="M49 64q-18-17-25-5 9 12 25 5Z" fill="#a8c995"/><g fill="#fff1d8" stroke="#e4cba6" stroke-width="1.2"><ellipse cx="50" cy="20" rx="7" ry="15"/><ellipse cx="50" cy="20" rx="7" ry="15" transform="rotate(45 50 20)"/><ellipse cx="50" cy="20" rx="7" ry="15" transform="rotate(90 50 20)"/><ellipse cx="50" cy="20" rx="7" ry="15" transform="rotate(135 50 20)"/></g><circle cx="50" cy="20" r="8" fill="#edc45f" stroke="#c9973e" stroke-width="1.5"/><path d="M25 79h50" stroke="#c6a17b" stroke-width="3" stroke-linecap="round"/></svg>',
  // Day 14 — three different flowers forming a small garden.
  '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M10 77q40-12 80 0" fill="#dce9ce"/><path d="M23 75V47m27 28V35m27 40V48" stroke="#71966f" stroke-width="3.5" stroke-linecap="round"/><path d="M23 62q-13-13-17-3 7 10 17 3m27-13q-16-15-21-3 9 10 21 3m27 14q13-13 18-3-8 10-18 3" fill="#a9c99a"/><g fill="#e9a6bd"><circle cx="23" cy="42" r="7"/><circle cx="17" cy="36" r="6"/><circle cx="29" cy="36" r="6"/></g><g fill="#c9b2e8"><circle cx="50" cy="29" r="9"/><circle cx="42" cy="23" r="7"/><circle cx="58" cy="23" r="7"/></g><g fill="#f2cf7c"><circle cx="77" cy="43" r="7"/><circle cx="71" cy="37" r="5"/><circle cx="83" cy="37" r="5"/></g><circle cx="23" cy="42" r="2.5" fill="#f7d77e"/><circle cx="50" cy="29" r="3" fill="#f4d47e"/><circle cx="77" cy="43" r="2.5" fill="#fff0c7"/></svg>',
  // Day 30 — a sturdy growing plant with new leaves and buds.
  '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 78V24" stroke="#648c68" stroke-width="4" stroke-linecap="round"/><path d="M50 61C27 38 16 54 29 65c8 6 15 1 21-4Zm0-17c22-24 34-8 22 3-8 6-15 2-22-3Z" fill="#91b681" stroke="#648c68" stroke-width="1.4"/><path d="M50 35C35 20 41 8 50 4c10 8 14 20 0 31Z" fill="#b5cf91" stroke="#648c68" stroke-width="1.4"/><circle cx="29" cy="30" r="5" fill="#e8a2bc"/><circle cx="72" cy="27" r="5" fill="#e8a2bc"/><path d="M18 79h64" stroke="#c6a17b" stroke-width="3" stroke-linecap="round"/></svg>',
  // Day 50 — a distinctive tied bouquet of five flowers.
  '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 78 28 39m22 39 22-39M50 78V32" stroke="#648c68" stroke-width="3.5" stroke-linecap="round"/><path d="m38 58-12-7m36 7 12-7" stroke="#91b681" stroke-width="4" stroke-linecap="round"/><g fill="#e99db8" stroke="#bd7895" stroke-width="1.2"><circle cx="28" cy="32" r="9"/><circle cx="21" cy="25" r="6"/><circle cx="35" cy="25" r="6"/></g><g fill="#c9b2e8" stroke="#9277ae" stroke-width="1.2"><circle cx="72" cy="32" r="9"/><circle cx="65" cy="25" r="6"/><circle cx="79" cy="25" r="6"/></g><g fill="#f0c96f" stroke="#c49a50" stroke-width="1.2"><circle cx="50" cy="21" r="10"/><circle cx="42" cy="14" r="6"/><circle cx="58" cy="14" r="6"/></g><circle cx="28" cy="32" r="3" fill="#f4d47e"/><circle cx="72" cy="32" r="3" fill="#f4d47e"/><circle cx="50" cy="21" r="4" fill="#fff0c7"/><path d="m39 63 11 8 11-8-4 15H43Z" fill="#e5adbf" stroke="#b87892" stroke-width="1.5"/><path d="M50 70v9" stroke="#b87892" stroke-width="1.5"/></svg>',
  // Day 100 — a rare, layered lotus crowned by a golden halo.
  '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 78V57" stroke="#648c68" stroke-width="4" stroke-linecap="round"/><path d="M50 72C31 58 20 66 27 75c8 4 16 1 23-3Zm0 0c19-14 30-6 23 3-8 4-16 1-23-3Z" fill="#a8c995"/><circle cx="50" cy="31" r="27" fill="none" stroke="#e6c36f" stroke-width="2.5" stroke-dasharray="2 4"/><g fill="#d9b9e9" stroke="#a58bb8" stroke-width="1.2"><path d="M50 49C26 38 26 19 39 15c7 5 10 15 11 34Z"/><path d="M50 49C74 38 74 19 61 15c-7 5-10 15-11 34Z"/></g><g fill="#f0a9c1" stroke="#bd7895" stroke-width="1.2"><path d="M50 48C16 44 15 27 25 23c12 2 20 12 25 25Z"/><path d="M50 48C84 44 85 27 75 23c-12 2-20 12-25 25Z"/><path d="M50 47C37 28 40 10 50 5c10 5 13 23 0 42Z"/></g><path d="M50 43c-8-8-6-17 0-21 6 4 8 13 0 21Z" fill="#fff0c7" stroke="#c49a50" stroke-width="1.2"/><circle cx="50" cy="40" r="4" fill="#e9c46e"/></svg>'
  ];







// Small, purpose-specific UI sound palette. Sounds are opt-in at meaningful moments,
// not attached globally to every button press.
let cuteSoundContext = null;
let lastCuteSoundAt = 0;
function playCuteSound(kind = 'tap') {
  if (localStorage.getItem('cuteBunnyAppSounds') === 'off') return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    const now = performance.now();
    if (now - lastCuteSoundAt < 55) return;
    lastCuteSoundAt = now;
    const context = cuteSoundContext || (cuteSoundContext = new Audio());
    if (context.state === 'suspended') void context.resume();
    const t = context.currentTime;
    const presets = {
      tap:     { start: 620, end: 470, duration: .075, volume: .035, type: 'sine' },
      buddy:   { start: 520, peak: 760, end: 390, duration: .25, volume: .075, type: 'sine' },
      boing:   { start: 360, peak: 790, end: 320, duration: .23, volume: .07, type: 'sine' },
      sparkle: { start: 880, peak: 1320, end: 1180, duration: .22, volume: .045, type: 'sine' },
      success: { start: 660, peak: 990, end: 1320, duration: .32, volume: .055, type: 'sine' },
      card:    { start: 420, end: 560, duration: .09, volume: .03, type: 'triangle' }
    };
    const sound = presets[kind] || presets.tap;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = sound.type;
    oscillator.frequency.setValueAtTime(sound.start, t);
    if (sound.peak) oscillator.frequency.exponentialRampToValueAtTime(sound.peak, t + sound.duration * .42);
    oscillator.frequency.exponentialRampToValueAtTime(sound.end, t + sound.duration);
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(sound.volume, t + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, t + sound.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(t);
    oscillator.stop(t + sound.duration + .015);
  } catch {}
}
async function popLoveHeart(card, event) {
  if (!card || !me || !sb) return false;
  const memoryRoot = card.closest('[data-memory]');
  const memoryId = String(memoryRoot?.dataset.memory || '');
  if (!memoryId || memoryLikeInFlight.has(memoryId)) return false;
  const item = feed.find(memory => String(memory.id) === memoryId);
  if (!item || item.isPending) return false;
  const ownerId = String(item.owner_id || item.author?.id || memoryRoot?.dataset.owner || '');
  if (!ownerId || ownerId === String(me.id)) return false;
  const wasLiked = !!item.liked_by_me;
  const previousCount = Number(item.like_count || 0);
  const nextLiked = !wasLiked;
  const nextCount = Math.max(0, previousCount + (nextLiked ? 1 : -1));
  item.liked_by_me = nextLiked; item.like_count = nextCount;
  const paint = () => {
    const hasAnyLikes = Number(item.like_count || 0) > 0;
    document.querySelectorAll('[data-memory="' + CSS.escape(memoryId) + '"]').forEach(root => {
      root.classList.toggle('is-loved', hasAnyLikes);
      root.querySelectorAll('.chat-bubble, .tile').forEach(target => {
        target.classList.toggle('is-loved', hasAnyLikes);
        const indicator = target.querySelector('.reaction-heart-indicator .heart-outline-glyph');
        if (indicator) { indicator.textContent = hasAnyLikes ? '♥' : '♡'; indicator.closest('.reaction-heart-indicator')?.classList.toggle('is-lit', hasAnyLikes); }
      });
      root.setAttribute('data-liked-by-me', String(item.liked_by_me));
      root.setAttribute('data-like-count', String(item.like_count));
    });
  };
  paint();
  // Match perfect-2: replay the existing card/bubble heart animation only.
  // Do not create an additional floating heart at the tap position.
  document.querySelectorAll('[data-memory="' + CSS.escape(memoryId) + '"]').forEach(root => {
    root.querySelectorAll('.chat-bubble, .tile').forEach(target => {
      target.classList.remove('heart-tap');
      void target.offsetWidth;
      target.classList.add('heart-tap');
      clearTimeout(target.heartTimer);
      target.heartTimer = setTimeout(() => target.classList.remove('heart-tap'), 850);
    });
  });
  memoryLikeInFlight.add(memoryId);
  try {
    const result = nextLiked
      ? await sb.from('memory_likes').upsert({ memory_id: item.id, user_id: me.id }, { onConflict: 'memory_id,user_id', ignoreDuplicates: true })
      : await sb.from('memory_likes').delete().eq('memory_id', item.id).eq('user_id', me.id);
    if (result.error) throw result.error;
    // Keep the optimistic state: the memory_likes Realtime subscription
    // reconciles counts across devices. Avoid a second SELECT on every tap.
    if (nextLiked) recordStreakDailyQuest('heart', memoryId);
    return true;
  } catch (error) {
    item.liked_by_me = wasLiked; item.like_count = previousCount; paint();
    console.warn('Could not save memory reaction:', error?.message || error);
    toast('Your like could not be saved. Please try again.');
    return false;
  } finally { memoryLikeInFlight.delete(memoryId); }
}

async function refreshMemoryLikeIndicators() {
  if (!sb || !me || !feed.length) return;
  const ids = [...new Set(feed.filter(item => !item.isPending).map(item => item.id).filter(Boolean))];
  if (!ids.length) return;
  const { data, error } = await sb.from('memory_likes').select('memory_id,user_id').in('memory_id', ids);
  if (error) throw error;
  const states = new Map();
  for (const row of data || []) {
    const key = String(row.memory_id); const state = states.get(key) || { count: 0, mine: false };
    state.count++; if (String(row.user_id) === String(me.id)) state.mine = true; states.set(key, state);
  }
  for (const item of feed) {
    if (item.isPending) continue;
    const state = states.get(String(item.id)) || { count: 0, mine: false };
    item.like_count = state.count; item.liked_by_me = state.mine;
    const lit = state.count > 0;
    document.querySelectorAll('[data-memory="' + CSS.escape(String(item.id)) + '"]').forEach(root => {
      root.classList.toggle('is-loved', lit);
      root.querySelectorAll('.chat-bubble, .tile').forEach(target => {
        target.classList.toggle('is-loved', lit);
        const glyph = target.querySelector('.reaction-heart-indicator .heart-outline-glyph');
        if (glyph) { glyph.textContent = lit ? '♥' : '♡'; glyph.closest('.reaction-heart-indicator')?.classList.toggle('is-lit', lit); }
      });
    });
  }
}
function go(p, options = {}) {
  const previousPage = page;
  const validPages = ['home', 'gallery', 'music', 'notes', 'friends', 'streak'];
  if (!validPages.includes(p)) return;
  if (options.resetStack) appPageStack = [p];
  else if (!options.fromBack && p !== page && appBackGuardInstalled) appPageStack.push(p);
  if (page === 'notes' && p !== 'notes') {
    noteSeenObserver?.disconnect();
    noteSeenObserver = null;
    stopNotesTyping();
    clearTimeout(noteSeenDebounceTimer);
    noteSeenPending.clear();
    $('#chatInput')?.blur();
    document.querySelector('.chat-page')?.classList.remove('notes-keyboard-open');
    document.body.classList.remove('notes-keyboard-open');
    document.body.classList.remove('notes-page-active');
    document.body.classList.remove('notes-header-hidden');
    document.documentElement.style.setProperty('--notes-keyboard-inset', '0px');
    document.documentElement.style.removeProperty('--notes-page-height');
    document.documentElement.style.removeProperty('--notes-nav-height');
    document.documentElement.style.removeProperty('--notes-header-collapse-size');
    document.querySelector('.chat-page')?.style.removeProperty('--notes-composer-space');
    notesHeaderLastScrollTop = null;
    notesKeyboardDismissed = false;
    notesKeyboardFollowLatest = false;
    
  }

  page = p;
  updateNotificationBadge();
  void markNavNotificationsSeen(p);
  $('#crumb').textContent = ({ home: 'Home', gallery: 'Photos', music: 'Music', notes: 'Notes', friends: 'Friends', streak: 'Streak Garden' })[p];
  document.querySelectorAll('#nav button[data-page]').forEach(b => {
    const isCurrentPage = b.dataset.page === p;
    b.classList.toggle('active', isCurrentPage);
    if (isCurrentPage) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  hideMessageActions();
  document.body.classList.toggle('notes-page-active', p === 'notes');
  if (p === 'notes') {
    document.body.classList.remove('notes-header-hidden');
    notesHeaderLastScrollTop = null;
    notesKeyboardDismissed = false;
  }
  // Start Notes at the app's top-level header rather than inheriting another
  // page's document scroll position.
  window.scrollTo({ top: 0, behavior: 'auto' });
  render({ followLatest: p === 'notes' && previousPage === 'notes' });
  if (p === 'gallery' && !mediaInitialLoaded.photo) void loadLatestMedia('photo');
  else if (p === 'music' && !mediaInitialLoaded.song) void loadLatestMedia('song');
  syncPresenceUI();
  void updateMyPresencePage();

  if (p === 'notes') {
    void clearActiveNotesNotifications();
    requestAnimationFrame(() => {
      if (page !== 'notes') return;
      const thread = $('#chatThread');
      if (thread) thread.scrollTop = thread.scrollHeight;
      notesHeaderLastScrollTop = thread?.scrollTop ?? null;
      syncNotesKeyboardLayout();
      void refreshOwnNoteSeenStatus();
    });
  }
}





/* Keep Android/browser Back inside the app until Home is reached. */
function installAppBackNavigation() {
  appPageStack = ['home'];
  appBackExitArmedUntil = 0;
  appBackExitPending = false;
  try {
    history.replaceState({ cuteBunnyAppRoot: true }, '', window.location.href);
    history.pushState({ cuteBunnyBackGuard: true }, '', window.location.href);
    appBackGuardInstalled = true;
  } catch {
    appBackGuardInstalled = false;
  }
}

function pushAppBackGuard() {
  if (!appBackGuardInstalled || appBackExitPending) return;
  try {
    history.pushState({ cuteBunnyBackGuard: true }, '', window.location.href);
  } catch {
    appBackGuardInstalled = false;
  }
}

function showAppExitDialog() {
  const gate = $('#appExitGate');
  if (!gate) {
    toast('You are at Home. Use your browser controls to leave Cute Bunny.');
    pushAppBackGuard();
    return;
  }
  appExitStep = 0;
  $('#appExitPrompt').hidden = false;
  $('#appExitCatStep').hidden = true;
  gate.classList.remove('hidden');
  // Keep one guard above the app root while the confirmation is visible.
  pushAppBackGuard();
}

function finishAppExit() {
  appBackExitPending = true;
  $('#appExitGate')?.classList.add('hidden');
  // A normal browser tab cannot be force-closed by page JavaScript. Go back
  // past the app's two in-page guard entries; on a direct-open tab, leave a
  // blank page as the safe fallback rather than pretending the tab closed.
  if (history.length > 2) {
    history.go(-2);
    return;
  }
  try { window.close(); } catch {}
  window.location.replace('about:blank');
}

function handleAppBackNavigation() {
  if (!appBackGuardInstalled || appBackExitPending || !me || $('#app')?.classList.contains('hidden')) return;

  // The first Back action dismisses the software keyboard without changing pages.
  const input = $('#chatInput');
  if (document.activeElement === input || document.body.classList.contains('notes-keyboard-open')) {
    input?.blur();
    requestAnimationFrame(syncNotesKeyboardLayout);
    appBackExitArmedUntil = 0;
    pushAppBackGuard();
    return;
  }

  // Back closes an open dialog or transient panel before navigating the app.
  if (document.querySelector('.auth-gate:not(.hidden)')) {
    closeAllGates();
    pushAppBackGuard();
    return;
  }
  if (activeMessageActionsId) {
    hideMessageActions();
    pushAppBackGuard();
    return;
  }
  const musicPanel = $('#nowPlayingPanel');
  if (musicPanel && !musicPanel.classList.contains('hidden')) {
    toggleMusicIsland(false);
    pushAppBackGuard();
    return;
  }

  // Each section visit is kept in a lightweight in-app stack.
  if (appPageStack.length > 1) {
    appPageStack.pop();
    const previousPage = appPageStack[appPageStack.length - 1];
    go(previousPage, { fromBack: true });
    appBackExitArmedUntil = 0;
    pushAppBackGuard();
    return;
  }

  // At Home, ask before leaving. Exit requires a second deliberate tap on the
  // little cat confirmation, so a stray Back press cannot close the scrapbook.
  appBackExitArmedUntil = 0;
  showAppExitDialog();
}

window.addEventListener('popstate', handleAppBackNavigation);
window.addEventListener('pagehide', stopNotesTyping);

/* One reusable note message structure for the Notes conversation and Home history. */






/* Clean Notes conversation; message markup is shared with Home → Memory History. */


/* Achievement Garden — earned blooms remain in the collection permanently. */
function achievementGardenMarkup(items) {
  const stats = {
    memories: items.length,
    photos: items.filter(item => item.kind === 'photo').length,
    notes: items.filter(item => item.kind === 'note').length,
    songs: items.filter(item => item.kind === 'song').length,
    streak: Math.max(0, Number(me?.login_streak) || 0),
    hearts: Math.max(0, Number(me?.heartCount) || 0)
  };
  const achievements = [
    { id:'first-memory', title:'First Little Memory', detail:'Save your first shared moment', value:stats.memories, goal:1, unit:'memory', art:'memory', flower:'Forget-me-not' },
    { id:'photo-collector', title:'Photo Collector', detail:'Keep five photos in your garden', value:stats.photos, goal:5, unit:'photos', art:'camera', flower:'Daisy' },
    { id:'love-letter', title:'Little Correspondent', detail:'Share five notes together', value:stats.notes, goal:5, unit:'notes', art:'letter', flower:'Rose' },
    { id:'playlist-curator', title:'Playlist Curator', detail:'Add three songs to your playlist', value:stats.songs, goal:3, unit:'songs', art:'music', flower:'Bluebell' },
    { id:'flower-day-3', title:'Tiny Sprout', detail:'Reach a three-day login streak', value:stats.streak, goal:3, unit:'days', art:'flower3', flower:'Seedling' },
    { id:'flower-day-7', title:'First Bloom', detail:'Reach a seven-day login streak', value:stats.streak, goal:7, unit:'days', art:'flower7', flower:'Daisy' },
    { id:'flower-day-14', title:'Little Garden', detail:'Reach a fourteen-day login streak', value:stats.streak, goal:14, unit:'days', art:'flower14', flower:'Mixed garden' },
    { id:'flower-day-30', title:'Growing Together', detail:'Reach a thirty-day login streak', value:stats.streak, goal:30, unit:'days', art:'flower30', flower:'Blooming plant' },
    { id:'flower-day-50', title:'Golden Bouquet', detail:'Reach a fifty-day login streak', value:stats.streak, goal:50, unit:'days', art:'flower50', flower:'Golden bouquet' },
    { id:'flower-day-100', title:'Everlasting Garden', detail:'Reach a one-hundred-day login streak', value:stats.streak, goal:100, unit:'days', art:'flower100', flower:'Lotus' },
    { id:'heart-keeper', title:'Heart Keeper', detail:'Collect one hundred hearts on your memories', value:stats.hearts, goal:100, unit:'hearts', art:'heart', flower:'Pink Camellia' },
    { id:'heart-bloom-500', title:'Halfway to a Thousand', detail:'Collect 500 lifetime hearts', value:stats.hearts, goal:500, unit:'hearts', art:'five', flower:'Cosmos' },
    { id:'heart-bloom-1000', title:'Thousand Heart Garden', detail:'Collect 1,000 lifetime hearts', value:stats.hearts, goal:1000, unit:'hearts', art:'thousand', flower:'Peony' },
    { id:'heart-bloom-1500', title:'Everlasting Rose', detail:'Collect 1,500 lifetime hearts', value:stats.hearts, goal:1500, unit:'hearts', art:'rose', flower:'Everlasting Rose' },
    { id:'heart-bloom-2000', title:'Heart of the Garden', detail:'Collect 2,000 lifetime hearts', value:stats.hearts, goal:2000, unit:'hearts', art:'crown', flower:'Crowned Lotus' }
  ];
  const key = 'cuteBunnyAchievements:' + String(me?.id || me?.username || 'guest');
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
  let changed = false;
  achievements.forEach(item => {
    if (item.value >= item.goal && !saved[item.id]) {
      saved[item.id] = new Date().toISOString();
      changed = true;
    }
  });
  if (changed) {
    try { localStorage.setItem(key, JSON.stringify(saved)); } catch {}
  }
  const earnedCount = achievements.filter(item => !!saved[item.id]).length;
  const artwork = {
    memory: '<path d="M12 7.5 24 4l12 3.5v29L24 40l-12-3.5z" fill="#f7e7cc" stroke="#b78a69" stroke-width="1.6"/><path d="M17 14h14M17 19h14M17 24h9" stroke="#b78a69" stroke-width="1.7" stroke-linecap="round"/><path d="M24 31c-5-3-6-8-2-9 2-.5 3 1 2 2 1-1.5 3-2.5 5-1 3 3-1 6-5 8z" fill="#df8baa"/>',
    camera: '<rect x="7" y="13" width="34" height="25" rx="6" fill="#e5edf5" stroke="#7995ad" stroke-width="1.7"/><path d="m14 13 3-5h13l4 5" fill="#d5e3ef" stroke="#7995ad" stroke-width="1.7"/><circle cx="24" cy="25" r="8" fill="#fff7e8" stroke="#7995ad" stroke-width="2"/><circle cx="24" cy="25" r="4" fill="#d69fba"/><circle cx="36" cy="18" r="1.8" fill="#d69fba"/>',
    letter: '<path d="M7 13q0-3 4-3h26q4 0 4 3v23q0 3-4 3H11q-4 0-4-3z" fill="#fff0f2" stroke="#c9859e" stroke-width="1.7"/><path d="m9 14 15 12 15-12" fill="none" stroke="#c9859e" stroke-width="2"/><path d="M24 28c-6-4-7-9-3-10 2-.6 3 1 3 2 1-2 4-3 6-1 3 3-1 7-6 9z" fill="#d97899"/>',
    music: '<path d="M28 8v23a6 6 0 1 1-4-5.7V14l17-4v17a6 6 0 1 1-4-5.7V8z" fill="#dcd7f4" stroke="#8d80b9" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 16q-5 8 0 16M14 19q-3 5 0 10" fill="none" stroke="#c18daf" stroke-width="2" stroke-linecap="round"/>',
    sunrise: '<circle cx="24" cy="25" r="15" fill="#ffe6ae" opacity=".7"/><path d="M8 31h32M12 31a12 12 0 0 1 24 0" fill="none" stroke="#d69a59" stroke-width="2.2" stroke-linecap="round"/><path d="M24 7v6M9 14l4 4M39 14l-4 4M5 27h6M37 27h6" stroke="#d69a59" stroke-width="2" stroke-linecap="round"/><path d="m18 29 6-5 6 5" fill="none" stroke="#9da982" stroke-width="2"/>',
    flower3: '<path d="M24 43V26" stroke="#648f6a" stroke-width="3" stroke-linecap="round"/><path d="M24 33Q11 20 7 29Q13 39 24 35Z" fill="#a9c99a"/><path d="M24 27Q36 14 41 23Q35 33 24 29Z" fill="#c2d9a7"/><path d="M24 25Q17 14 24 5Q32 15 24 25Z" fill="#8fb47f"/><path d="M8 44h32" stroke="#c6a17b" stroke-width="2.5" stroke-linecap="round"/>',
    flower7: '<path d="M24 43V26" stroke="#648f6a" stroke-width="3" stroke-linecap="round"/><g fill="#fff1d8" stroke="#e4cba6" stroke-width="1"><ellipse cx="24" cy="14" rx="4" ry="10"/><ellipse cx="24" cy="14" rx="4" ry="10" transform="rotate(45 24 14)"/><ellipse cx="24" cy="14" rx="4" ry="10" transform="rotate(90 24 14)"/><ellipse cx="24" cy="14" rx="4" ry="10" transform="rotate(135 24 14)"/></g><circle cx="24" cy="14" r="5" fill="#edc45f" stroke="#c9973e" stroke-width="1.2"/><path d="M24 37q-11-11-16-3 7 9 16 3Z" fill="#a8c995"/>',
    flower14: '<path d="M10 43V27m14 16V18m14 25V27" stroke="#71966f" stroke-width="2.6" stroke-linecap="round"/><g fill="#e9a6bd"><circle cx="10" cy="23" r="5"/><circle cx="6" cy="19" r="4"/><circle cx="14" cy="19" r="4"/></g><g fill="#c9b2e8"><circle cx="24" cy="14" r="6"/><circle cx="18" cy="10" r="4.5"/><circle cx="30" cy="10" r="4.5"/></g><g fill="#f2cf7c"><circle cx="38" cy="23" r="5"/><circle cx="34" cy="19" r="4"/><circle cx="42" cy="19" r="4"/></g><path d="M5 44q19-6 38 0" fill="none" stroke="#b6c99e" stroke-width="2"/>',
    flower30: '<path d="M24 44V11" stroke="#648c68" stroke-width="3.2" stroke-linecap="round"/><path d="M24 34Q7 18 5 29Q12 40 24 34Zm0-10Q40 7 44 19Q37 29 24 24Z" fill="#91b681" stroke="#648c68" stroke-width="1"/><path d="M24 16Q13 5 24 2Q35 7 24 16Z" fill="#b5cf91"/><circle cx="8" cy="14" r="3" fill="#e8a2bc"/><circle cx="40" cy="8" r="3" fill="#e8a2bc"/>',
    flower50: '<path d="M24 44 10 23m14 21 14-21M24 44V18" stroke="#648c68" stroke-width="2.8" stroke-linecap="round"/><g fill="#e99db8" stroke="#bd7895" stroke-width="1"><circle cx="10" cy="20" r="6"/><circle cx="6" cy="15" r="4"/><circle cx="14" cy="15" r="4"/></g><g fill="#c9b2e8" stroke="#9277ae" stroke-width="1"><circle cx="38" cy="20" r="6"/><circle cx="34" cy="15" r="4"/><circle cx="42" cy="15" r="4"/></g><g fill="#f0c96f" stroke="#c49a50" stroke-width="1"><circle cx="24" cy="13" r="7"/><circle cx="18" cy="8" r="4"/><circle cx="30" cy="8" r="4"/></g><path d="m17 31 7 5 7-5-3 12h-8Z" fill="#e5adbf" stroke="#b87892" stroke-width="1"/>',
    flower100: '<circle cx="24" cy="21" r="19" fill="none" stroke="#e6c36f" stroke-width="1.8" stroke-dasharray="2 3"/><path d="M24 44V34" stroke="#648c68" stroke-width="3" stroke-linecap="round"/><path d="M24 40Q12 31 7 39Q15 45 24 41Zm0 0q12-9 17-1-8 6-17 2Z" fill="#a8c995"/><g fill="#d9b9e9" stroke="#a58bb8" stroke-width="1"><path d="M24 32Q7 25 12 13Q22 14 24 32Z"/><path d="M24 32Q41 25 36 13Q26 14 24 32Z"/></g><g fill="#f0a9c1" stroke="#bd7895" stroke-width="1"><path d="M24 31Q2 29 5 18Q17 14 24 31Z"/><path d="M24 31Q46 29 43 18Q31 14 24 31Z"/><path d="M24 30Q15 11 24 4Q33 11 24 30Z"/></g><circle cx="24" cy="26" r="3" fill="#e9c46e"/>',
    heart: '<path d="M24 39S7 29 7 18c0-8 10-12 17-3 7-9 17-5 17 3 0 11-17 21-17 21z" fill="#e98eaa" stroke="#bd6688" stroke-width="1.8"/><path d="M15 17q2-5 7-3" fill="none" stroke="#fff3f5" stroke-width="2.4" stroke-linecap="round"/>',
    five: '<path d="M24 5 29 17 42 18 32 27 35 40 24 33 13 40 16 27 6 18 19 17z" fill="#e9bad0" stroke="#b87d9b" stroke-width="1.8"/><text x="24" y="27" text-anchor="middle" font-size="10" font-weight="900" fill="#86516e">500</text>',
    thousand: '<path d="M24 5c-11 0-18 9-18 19 0 10 8 18 18 18s18-8 18-18C42 14 35 5 24 5z" fill="#edc6d4" stroke="#b97897" stroke-width="1.8"/><path d="M24 10c-7 0-12 6-12 13 0 7 5 12 12 12s12-5 12-12c0-7-5-13-12-13z" fill="#fff0d2" stroke="#cf9c78"/><text x="24" y="27" text-anchor="middle" font-size="9" font-weight="900" fill="#8b5870">1K</text>',
    rose: '<path d="M24 42V27" stroke="#789a79" stroke-width="2.5" stroke-linecap="round"/><path d="M23 37q-11-11-16-4 5 8 16 5M25 34q10-12 15-5-4 8-15 7" fill="#b9d2ad" stroke="#789a79" stroke-width="1.2"/><g fill="#d9799a" stroke="#a64d70" stroke-width="1.2"><path d="M24 7c-7-5-14 1-10 8-8 2-6 12 2 12-1 8 10 10 12 3 8 3 14-6 7-11 5-7-3-15-11-11z"/><path d="M17 17q7-9 14 0-1 10-8 10-8-2-6-10z" fill="#f4b5c9"/></g><path d="M21 17q3-5 7-1-1 6-5 6" fill="none" stroke="#a64d70" stroke-width="1.5"/>',
    crown: '<path d="M24 42V26" stroke="#789a79" stroke-width="2.5"/><path d="M23 36q-9-10-14-4 5 7 14 5" fill="#b9d2ad"/><g fill="#d8c5ed" stroke="#9277ae" stroke-width="1.3"><path d="M24 5c-5-4-10 1-8 6-7 0-8 9-2 12-1 7 9 10 10 4 2 6 12 3 10-4 6-3 5-12-2-12-1-7-6-10-8-6z"/><circle cx="24" cy="20" r="8" fill="#f7e6b2" stroke="#c09a56"/></g><path d="m14 12 2-7 7 6 1-9 4 9 7-6 1 8" fill="#edca79" stroke="#a98548" stroke-width="1.6" stroke-linejoin="round"/>'
  };
  return `
    <section class="achievement-garden" aria-labelledby="achievementGardenTitle">
      <div class="achievement-garden-heading">
        <div><small>YOUR LITTLE FLOWER COLLECTION</small><h3 id="achievementGardenTitle">Milestones in bloom <span aria-hidden="true">✿</span></h3><p>Every little thing you grow stays in your garden.</p></div>
        <div class="achievement-count"><strong>${earnedCount}/${achievements.length}</strong><span>blooms earned</span></div>
      </div>
      <div class="achievement-grid">
        ${achievements.map(item => {
          const earned = !!saved[item.id];
          const progress = Math.min(100, Math.round((item.value / item.goal) * 100));
          const amount = Math.min(item.value, item.goal);
          return `<article class="achievement-card ${earned ? 'is-earned' : 'is-growing'}" data-achievement="${item.id}">
            <div class="achievement-medallion achievement-art achievement-art-${item.art}" aria-hidden="true"><svg viewBox="0 0 48 48" focusable="false">${artwork[item.art]}</svg></div>
            <div class="achievement-copy"><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p>
              <div class="achievement-progress" role="progressbar" aria-label="${esc(item.title)} progress" aria-valuemin="0" aria-valuemax="${item.goal}" aria-valuenow="${amount}"><span style="width:${progress}%"></span></div>
              <small>${earned ? '✿ Collected · ' + item.goal.toLocaleString() : amount.toLocaleString() + ' / ' + item.goal.toLocaleString()} ${esc(item.unit)}</small>
              ${earned ? '<span class="achievement-earned-stamp" aria-label="Unlocked">✦</span>' : ''}
            </div>
          </article>`;
        }).join('')}
      </div>
    </section>`;
}

function render(options = {}) {
  const c = $('#content');
  if (!c) return;
  if (page !== 'home') destroyBearPoseEngine();
  if (sb && me) startBearRealtime();

  if (page === 'notes') {
    renderNotesPage({ followLatest: !!options.followLatest });
    requestAnimationFrame(() => { observeNotificationMemoryViews(); observeFeedHistory(); observeNoteSeenMessages(); });
    return;
  }
  if (page === 'streak') {
    renderStreakPage();
    return;
  }

  const visibleFeed = feed.filter(x => !pendingDeleteTimers.has(String(x.id)) && !(x.kind === 'note' && hiddenNoteIds.has(String(x.id))));
  const allPics = visibleFeed.filter(x => x.kind === 'photo');
  const allSongs = visibleFeed.filter(x => x.kind === 'song');
  const pics = page === 'gallery'
    ? [...allPics].sort((a, b) => {
        const aTime = Date.parse(a.createdAt || a.created_at || 0) || 0;
        const bTime = Date.parse(b.createdAt || b.created_at || 0) || 0;
        return bTime - aTime || (Number(b.id) || 0) - (Number(a.id) || 0);
      }).slice(0, mediaVisibleCount.photo)
    : allPics;
  const songs = page === 'music' ? allSongs.slice(0, mediaVisibleCount.song) : allSongs;
  const notes = visibleFeed.filter(x => x.kind === 'note');

  if (page === 'home') {
    renderHomePage(c, visibleFeed, notes, pics, songs);
  } else if (page === 'gallery') {
    renderPhotosPage(c, pics);
  } else if (page === 'music') {
    renderMusicPage(c, songs);
  } else if (page === 'friends') {
    renderFriendsPage(c);
  }
  hydrateMedia();
  observeNotificationMemoryViews();
  requestAnimationFrame(observeFeedHistory);
}









// Keep the Settings panel and its flower trigger in sync when dismissed.









const PROFILE_WALLPAPERS = ['normal', 'blossom', 'clouds', 'starlight', 'hearts'];
const PROFILE_WALLPAPER_LABELS = { normal: 'Normal', blossom: 'Blossom Garden', clouds: 'Cloud Nook', starlight: 'Starlight', hearts: 'Heart Garden' };









/* Audio Player */
















/* Modals & Dialogs */
function closeAllGates() {
  closePhotoLightbox();
  closeMemoryActions();
  hideMessageActions();
  document.querySelectorAll('.auth-gate').forEach(gate => gate.classList.add('hidden'));
}





function openMemoryActions(id) {
  const item = feed.find(memory => String(memory.id) === String(id));
  if (!item) return;
  const gate = $('#memoryActionGate'), image = $('#memoryActionImage'), emoji = $('#memoryActionEmoji');
  const actionCard = gate.querySelector('.memory-action-card'), isPhoto = item.kind === 'photo', isNote = item.kind === 'note';
  gate.dataset.memoryId = String(item.id);
  actionCard.classList.toggle('is-song', item.kind === 'song');
  actionCard.classList.toggle('is-note', isNote);
  actionCard.classList.toggle('is-photo', isPhoto);

  const isOwnItem = String(item.author?.id || item.owner_id || '') === String(me?.id || '');
  const canDelete = isOwnItem && !item.isPending;
  $('#memoryDelete').classList.toggle('hidden', !canDelete);
  // Uploaded songs belong to their owner: offer Delete, not a redundant Save action.
  $('#memoryDownload').classList.toggle('hidden', isNote || (item.kind === 'song' && isOwnItem));
  // Clean delete text without dustbin box / emoji
  $('#memoryDelete').textContent = isNote ? 'Delete note' : item.kind === 'song' ? 'Delete song' : 'Delete photo';
  $('#memoryCopy').classList.toggle('hidden', !isNote);
  $('#memoryActionKicker').textContent = isPhoto ? 'A LITTLE PHOTO' : isNote ? 'A LITTLE NOTE' : 'A SONG TO KEEP';
  $('#memoryActionTitle').textContent = isPhoto ? 'A lovely moment' : isNote ? 'A note to keep' : (item.fileName || 'A little song');
  $('#memoryActionText').textContent = isPhoto ? 'Keep this sweet moment on your device?' : isNote ? 'Copy this message or delete it softly?' : isOwnItem ? 'You added this song to your garden.' : 'Save this song file for later?';
  $('#memoryDownload').textContent = isPhoto ? 'Save photo' : item.kind === 'song' ? 'Save song' : 'Save';

  const art = $('#memoryActionArt');
  art.classList.toggle('is-photo', isPhoto);
  image.classList.toggle('hidden', !isPhoto);
  emoji.classList.toggle('hidden', isPhoto);
  emoji.textContent = isPhoto ? '🌷' : isNote ? '💌' : '🎵';
  image.alt = 'A shared photo';
  image.removeAttribute('src');
  gate.classList.remove('hidden');

  if (isPhoto) {
    const thumbnail = [...document.querySelectorAll('.feed-item[data-memory]')].find(node => node.dataset.memory === String(item.id))?.querySelector('.feed-photo');
    const loadedSource = thumbnail?.getAttribute('src');
    if (loadedSource) image.src = loadedSource;
    else if (thumbnail) {
      void hydrateOneMedia(thumbnail).then(() => {
        const nextSource = thumbnail.getAttribute('src');
        if (gate.dataset.memoryId === String(item.id) && nextSource) image.src = nextSource;
      });
    }
  }
}

function closeMemoryActions() {
  const gate = $('#memoryActionGate');
  gate.classList.add('hidden');
  $('#memoryActionImage').removeAttribute('src');
}

/* Two-button floating popup above pressed message: Copy and Delete */
function showMessageActions(id, bubbleElement, photoTarget = false) {
  hideMessageActions();
  const memory = feed.find(m => String(m.id) === String(id));
  if (!memory || !bubbleElement) return;

  activeMessageActionsId = String(id);
  const ownsMessage = String(memory.author?.id || memory.owner_id || '') === String(me?.id || '');
  const popup = document.createElement('div');
  popup.className = 'chat-actions-popup' + (photoTarget ? ' is-photo-actions' : '');
  popup.setAttribute('role', 'toolbar');
  popup.setAttribute('aria-label', photoTarget ? 'Photo message options' : 'Message options');
  popup.innerHTML = photoTarget
    ? `<button type="button" class="chat-action-btn reply-btn" data-chat-reply="${esc(id)}">Reply</button>
      <button type="button" class="chat-action-btn delete-btn" ${ownsMessage ? 'data-chat-delete' : 'data-chat-hide'}="${esc(id)}">${ownsMessage ? 'Delete' : 'Hide'}</button>`
    : `<button type="button" class="chat-action-btn reply-btn" data-chat-reply="${esc(id)}">Reply</button>
      ${ownsMessage ? `<button type="button" class="chat-action-btn edit-btn" data-chat-edit="${esc(id)}">Edit</button>` : ''}
      <button type="button" class="chat-action-btn" data-chat-copy="${esc(id)}">Copy</button>
      <button type="button" class="chat-action-btn delete-btn" ${ownsMessage ? 'data-chat-delete' : 'data-chat-hide'}="${esc(id)}">${ownsMessage ? 'Delete' : 'Hide'}</button>`;
  popup.style.position = 'fixed';
  popup.style.zIndex = '1000';
  document.body.append(popup);

  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft || 0;
  const viewportTop = viewport?.offsetTop || 0;
  const viewportWidth = viewport?.width || window.innerWidth;
  const viewportHeight = viewport?.height || window.innerHeight;
  const sidePadding = 10;
  const gap = 7;
  const isMine = !!bubbleElement.closest('.chat-message.is-mine');

  const placePopup = () => {
    if (!popup.isConnected || !bubbleElement.isConnected) return;
    const bubbleRect = bubbleElement.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    // Put the options in front of the bubble: incoming on the right,
    // the current user's own messages on the left.
    const desiredLeft = isMine
      ? bubbleRect.left - popupRect.width - gap
      : bubbleRect.right + gap;
    const minLeft = viewportLeft + sidePadding;
    const maxLeft = Math.max(
      minLeft,
      viewportLeft + viewportWidth - popupRect.width - sidePadding
    );
    const left = Math.max(minLeft, Math.min(maxLeft, desiredLeft));

    // Center the action pill vertically alongside its message and keep it
    // fully visible on short screens or when the keyboard is open.
    const minCenterY = viewportTop + sidePadding + popupRect.height / 2;
    const maxCenterY = Math.max(
      minCenterY,
      viewportTop + viewportHeight - sidePadding - popupRect.height / 2
    );
    const centerY = Math.max(
      minCenterY,
      Math.min(maxCenterY, bubbleRect.top + bubbleRect.height / 2)
    );

    popup.style.left = left + 'px';
    popup.style.top = centerY + 'px';
  };

  placePopup();
}

function hideMessageActions() {
  document.querySelectorAll('.chat-actions-popup').forEach(el => el.remove());
  activeMessageActionsId = null;
}

async function copyMemoryText(id) {
  const item = feed.find(memory => String(memory.id) === String(id));
  if (!item) return;
  const text = String(item.text || item.fileName || '');
  try {
    if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    toast('Note copied ♡');
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    try {
      document.execCommand('copy');
      toast('Note copied ♡');
    } catch {
      toast('Could not copy note text.');
    }
    field.remove();
  }
}

function hideNoteForMe(id) {
  const item = feed.find(memory => String(memory.id) === String(id));
  if (!item || item.kind !== 'note') return;
  hiddenNoteIds.add(String(id));
  try {
    localStorage.setItem('cuteBunnyHiddenNotes:' + me.id, JSON.stringify([...hiddenNoteIds]));
  } catch {
    toast('Could not save this hidden message on this device.');
  }
  hideMessageActions();
  if (page === 'notes') renderNotesPage();
  else render();
  toast('Message removed from your view ♡');
}

async function deleteSafely(id) {
  const item = feed.find(x => String(x.id) === String(id));
  if (!item) return;
  const mine = String(item.author?.id || item.owner_id || '') === String(me?.id || '');
  if (!mine) return toast('You can only delete your own memories ♡');
  if (pendingDeleteTimers.has(String(id))) return;

  const card = document.querySelector(`[data-memory="${CSS.escape(String(id))}"]`);
  card?.classList.add('is-pending-delete');

  const undo = document.createElement('button');
  undo.className = 'undo-toast';
  undo.textContent = 'Deleted softly · Undo';
  undo.setAttribute('aria-label', 'Undo delete');
  document.body.append(undo);

  const timer = setTimeout(async () => {
    pendingDeleteTimers.delete(String(id));
    undo.remove();
    try {
      const deletion = await api('/memories/' + encodeURIComponent(id), { method: 'DELETE' });
      const deletedNoteIds = new Set((deletion?.deletedNoteIds || []).map(String));
      const deletedPhotoIds = new Set((deletion?.deletedPhotoIds || []).map(String));
      feed = feed.filter(m =>
        String(m.id) !== String(id) &&
        !deletedNoteIds.has(String(m.id)) &&
        !deletedPhotoIds.has(String(m.id))
      );
      // Keep any remaining Notes attachment lists in sync with deleted gallery photos.
      feed.forEach(memory => {
        if (Array.isArray(memory.photos)) {
          memory.photos = memory.photos.filter(photo => !deletedPhotoIds.has(String(photo.id)));
        }
      });
      if (String(playlist[playlistIndex]?.id) === String(id)) {
        const audio = $('#globalAudio');
        songLoadSequence++;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
        audioObjectUrl = '';
        playlistIndex = -1;
        syncPlayer();
      }
      render();
      toast('Memory tucked away ♡');
    } catch (e) {
      card?.classList.remove('is-pending-delete');
      toast(e.message);
    }
  }, 6500);

  pendingDeleteTimers.set(String(id), { timer, card, undo });
  if (page === 'notes') renderNotesPage();
  else render();

  undo.onclick = () => {
    clearTimeout(timer);
    pendingDeleteTimers.delete(String(id));
    card?.classList.remove('is-pending-delete');
    undo.remove();
    if (page === 'notes') renderNotesPage();
    else render();
    toast('Memory restored ♡');
  };
}

async function downloadMemoryById(id, button) {
  const item = feed.find(memory => String(memory.id) === String(id));
  if (item?.previewUrl && !item.storagePath) {
    const link = document.createElement('a');
    link.href = item.previewUrl;
    link.download = String(item.fileName || 'cute-bunny-photo.jpg').replace(/[\/:*?"<>|]/g, '_');
    document.body.append(link);
    link.click();
    link.remove();
    toast('Saved to your device ♡');
    return;
  }
  if (!item?.storagePath) return toast('This file is not available to download yet ♡');
  const original = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = '<span class="download-spinner" aria-hidden="true"></span> Saving…';
  }
  try {
    const { data, error } = await sb.storage.from('memories').download(item.storagePath);
    if (error) throw error;
    const url = URL.createObjectURL(data), link = document.createElement('a');
    const fallback = item.kind === 'photo' ? 'cute-bunny-photo.jpg' : 'cute-bunny-song';
    link.href = url;
    link.download = String(item.fileName || fallback).replace(/[\/:*?"<>|]/g, '_');
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast('Saved to your device ♡');
  } catch (error) {
    toast(error.message || 'Could not download this file. Try again ♡');
  } finally {
    if (button) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.innerHTML = original;
    }
  }
}









/* Ephemeral Notes typing uses its own Realtime Broadcast channel.
   The typing hint is attached to the conversation thread, never the composer,
   and heartbeat/expiry timings are short enough to feel live without flicker. */
let notesTypingChannel = null;
const NOTES_TYPING_HEARTBEAT_MS = 650;
const NOTES_TYPING_EXPIRY_MS = 2300;
const NOTES_TYPING_IDLE_MS = 800;















/* Notes read receipts: mark only messages that remain substantially visible. */










// Realtime INSERT events can be missed when a browser's Supabase socket is
// interrupted. While Notes is visible, poll only the newest friend note as a
// lightweight fallback; this removes stale Seen without requiring a refresh.









/* Realtime */
async function touchLastActive(force = false) {
  if (!me?.id || !sb || document.hidden) return;
  if (lastActiveWriteUserId !== String(me.id)) {
    lastActiveWriteUserId = String(me.id);
    lastActiveWriteAt = 0;
  }
  const now = Date.now();
  if (!force && now - lastActiveWriteAt < 120000) return;
  lastActiveWriteAt = now;
  const timestamp = new Date(now).toISOString();
  const { error } = await sb.from('profiles').update({ last_active_at: timestamp }).eq('id', me.id);
  if (error) {
    console.warn('Last-active timestamp could not be saved:', error.message || error);
    return;
  }
  me.last_active_at = timestamp;
}

document.addEventListener('pointerdown', () => { void touchLastActive(); }, { passive: true });
document.addEventListener('keydown', () => { void touchLastActive(); }, { passive: true });
window.addEventListener('focus', () => { void touchLastActive(true); });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    if (presenceStatus === 'error' || presenceStatus === 'closed' || !presenceChannel) {
      schedulePresenceReconnect('foreground');
    } else {
      void updateMyPresencePage();
    }
    void touchLastActive(true);
    if (page === 'notes') requestAnimationFrame(observeNoteSeenMessages);
  } else {
    void updateMyPresencePage();
    stopNotesTyping();
    clearTimeout(noteSeenDebounceTimer);
  }
});

function startRealtime() {
  if (!sb || !me) return;
  closeRealtime();
  startBearRealtime();
  const realtimeGeneration = presenceClientGeneration;
  presenceStatus = 'connecting';
  try {
    // Each browser tab/device gets its own key; the user_id payload lets peers
    // aggregate all active sessions without key collisions.
    const clientPresenceKey = 'cb-' + String(me.id) + '-' +
      (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
    const presence = sb.channel('cute-bunny-presence', { config: { presence: { key: clientPresenceKey } } });
    presenceChannel = presence;
    notesTypingChannel = sb.channel('cute-bunny-notes-typing')
      .on('broadcast', { event: 'typing' }, ({ payload }) => receiveNotesTyping(payload))
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          notesTypingChannelReady = true;
          const queuedState = notesTypingQueuedState;
          notesTypingQueuedState = null;
          void sendNotesTyping(queuedState == null ? typingActive : queuedState);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          notesTypingChannelReady = false;
          console.warn('Notes typing channel status:', status);
        }
      });
    // Keep transient Notes activity on its own broadcast-only channel.
    // Presence remains responsible solely for online/page metadata.
    notesActivityChannelReady = false;
    notesActivityChannel = sb.channel('cute-bunny-notes-activity', {
      config: { broadcast: { self: false, ack: true } }
    })
      .on('broadcast', { event: 'notes_page_transition' }, ({ payload }) => {
        handleNotesPageTransition(payload);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          notesActivityChannelReady = true;
          const queued = pendingNotesPageTransitions.splice(0);
          queued.forEach(payload => { void sendNotesPageTransition(payload); });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          notesActivityChannelReady = false;
          console.warn('Notes activity channel status:', status);
        }
      });

    presence
      .on('presence', { event: 'sync' }, () => {
        if (realtimeGeneration === presenceClientGeneration) syncPresenceUI('sync');
      })
      .on('presence', { event: 'join' }, () => {
        if (realtimeGeneration === presenceClientGeneration) syncPresenceUI('join');
      })
      .on('presence', { event: 'leave' }, () => {
        if (realtimeGeneration === presenceClientGeneration) syncPresenceUI('leave');
      })
      .subscribe(async status => {
        if (realtimeGeneration !== presenceClientGeneration) return;
        if (status === 'SUBSCRIBED') {
          presenceStatus = 'ready';
          clearTimeout(presenceReconnectTimer);
          presenceReconnectTimer = null;
          syncPresenceUI();
          await updateMyPresencePage();
          if (presenceStatus === 'ready') {
            presenceReconnectAttempts = 0;
            void touchLastActive(true);
          } else {
            schedulePresenceReconnect('initial-track-failed');
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          presenceStatus = 'error';
          syncPresenceUI();
          schedulePresenceReconnect(status);
        }
      });

    // Keep presence metadata fresh without coupling it to typing activity.
    clearInterval(presenceHeartbeatTimer);
    presenceHeartbeatTimer = setInterval(() => {
      if (!me || !presenceChannel || document.hidden) return;
      if (presenceStatus === 'ready') {
        const trackAge = Date.now() - presenceLastSuccessfulTrackAt;
        if (!presenceLastSuccessfulTrackAt || trackAge > PRESENCE_HEARTBEAT_MS * 2.5) {
          // SUBSCRIBED can remain stale while the underlying socket is half-open.
          // Force the normal backoff reconnect instead of displaying stale state.
          presenceStatus = 'error';
          syncPresenceUI();
          schedulePresenceReconnect('heartbeat-stale-track');
        } else if (trackAge >= PRESENCE_HEARTBEAT_MS) {
          void updateMyPresencePage();
        }
      } else if (presenceStatus === 'error' || presenceStatus === 'closed') {
        schedulePresenceReconnect('heartbeat');
      }
      // Keep last-active fallback current even when the user is reading without
      // pointer or keyboard input; writes remain throttled inside touchLastActive.
      void touchLastActive();
    }, PRESENCE_HEARTBEAT_MS);

    profileChannel = sb.channel('cute-bunny-profiles-' + me.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, payload => {
        const changedId = String(payload.new?.id || '');
        if (!changedId) return;
        if (changedId === String(me?.id)) {
          const nextCount = Number(payload.new?.login_streak);
          const nextDate = String(payload.new?.last_login_date || '').slice(0, 10);
          if (Number.isInteger(nextCount) && nextCount >= 0) me.login_streak = nextCount;
          if (/^\\d{4}-\\d{2}-\\d{2}$/.test(nextDate)) me.last_login_date = nextDate;
          me.streak_timezone = normalizeStreakTimeZone(payload.new?.streak_timezone || me.streak_timezone);
          syncStreakWidget();
          if (page === 'streak') renderStreakPage();
          return;
        }
        const changedFriend = friends.find(friend => String(friend.id) === changedId);
        if (changedFriend) {
          if (payload.new?.last_active_at) {
            changedFriend.last_active_at = payload.new.last_active_at;
            syncPresenceUI();
          }
          const streakChanged =
            Number(payload.new?.login_streak) !== Number(changedFriend.login_streak) ||
            String(payload.new?.last_login_date || '') !== String(changedFriend.last_login_date || '') ||
            String(payload.new?.streak_timezone || '') !== String(changedFriend.streak_timezone || '');
          if (streakChanged) {
            clearTimeout(window.cuteStreakProfileRefresh);
            window.cuteStreakProfileRefresh = setTimeout(() => {
              void refresh().catch(error => console.warn('Friend streak refresh failed:', error?.message || error));
            }, 350);
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_garden_collections' }, payload => {
        const row = payload?.new || {};
        const changedId = String(row.user_id || payload?.old?.user_id || '');
        if (!changedId || payload?.eventType === 'DELETE') return;
        const collection = normalizeGardenCollection(row);
        const profileGate = $('#friendProfileGate');
        if (changedId === String(me?.id)) {
          cloudPetalPoints = Math.max(0, Number(row.petal_points) || 0);
          // A committed realtime row confirms that the pending local change reached
          // the database, so adopt the same snapshot on this device.
          try {
            localStorage.setItem(streakStorageKey('garden-collection'), JSON.stringify(collection));
            localStorage.setItem(streakStorageKey('garden-collection-reconciled'), '1');
            localStorage.removeItem(streakStorageKey('garden-collection-pending-sync'));
          } catch {}
          if (page === 'streak') {
            updateGardenShopItem('', collection);
            updateGardenPetalBalance();
          }
          if (profileGate && !profileGate.classList.contains('hidden') &&
              profileGate.dataset.collectionUserId === changedId) {
            renderFriendGardenCollection(collection, changedId, true);
            const petalsNode = $('#friendProfilePetals');
            if (petalsNode) petalsNode.textContent = cloudPetalPoints.toLocaleString();
          }
          return;
        }
        if (profileGate && !profileGate.classList.contains('hidden') &&
            profileGate.dataset.collectionUserId === changedId) {
          renderFriendGardenCollection(collection, changedId, false);
          const petalsNode = $('#friendProfilePetals');
          if (petalsNode) petalsNode.textContent = Math.max(0, Number(row.petal_points) || 0).toLocaleString();
        }
      }).subscribe();

    notificationChannel = sb.channel('cute-bunny-notifications-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.' + me.id }, payload => {
        const inserted = payload?.new;
        void api('/notifications').then(rows => {
          notificationRows = rows;
          notificationLoaded = true;
          updateNotificationBadge();
          if (['gallery', 'music', 'notes', 'friends'].includes(page)) void markNavNotificationsSeen(page);
          const added = rows.find(row => String(row.id) === String(inserted?.id));
          if (added) void showPhoneNotification(added);
          if (!$('#notificationGate').classList.contains('hidden')) renderNotifications();
        }).catch(error => console.warn('Live notification refresh failed:', error?.message || error));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.' + me.id }, payload => {
        const changed = payload?.new;
        if (!changed?.id) return;
        const row = notificationRows.find(item => String(item.id) === String(changed.id));
        if (row) {
          row.read_at = changed.read_at || null;
          updateNotificationBadge();
          if (!$('#notificationGate').classList.contains('hidden')) renderNotifications();
        } else if (notificationLoaded) {
          void loadNotifications();
        }
      }).subscribe();

    // The other person's read cursor is the source of our Seen receipt.
    // Subscribe directly so Seen appears as soon as their read is committed.
    noteReadCursorChannel = sb.channel('cute-bunny-note-read-cursors-' + me.id)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'note_read_cursors',
        filter: 'owner_id=eq.' + me.id
      }, payload => {
        if (String(payload?.new?.reader_id || '') === String(me.id)) return;
        clearTimeout(seenStatusRefreshTimer);
        seenStatusRefreshTimer = setTimeout(() => {
          void refreshOwnNoteSeenStatus();
        }, 10);
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('Seen receipt realtime channel status:', status);
        }
      });

    memoryChannel = sb.channel('cute-bunny-memories-' + me.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'memories' }, payload => {
        const updated = payload?.new || {};
        const item = feed.find(memory => String(memory.id) === String(updated.id));
        if (item) Object.assign(item, updated);
        if (page === 'notes') renderNotesPage();
        else if (page === 'home') render();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'memories' }, payload => {
        const removedId = String(payload?.old?.id || '');
        if (!removedId) return;
        feed = feed.filter(memory => String(memory.id) !== removedId);
        if (page === 'notes') renderNotesPage();
        else if (page === 'home') render();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'memories' }, payload => {
        const incoming = payload?.new || {};
        if (incoming.kind === 'note' && String(incoming.owner_id || '') !== String(me.id)) {
          lastObservedFriendNoteId = String(incoming.id || lastObservedFriendNoteId || '');
          if (page === 'notes') {
            // Hide the old receipt synchronously as soon as the friend's INSERT arrives.
            hideSeenReceiptImmediately();
          }
        }
        // Refresh only the shared memory feed; a full app refresh can rebuild
        // the current page and interrupt the Notes conversation.
        clearTimeout(window.cuteMemoryRefresh);
        window.cuteMemoryRefresh = setTimeout(async () => {
          try {
            const freshFeed = await api('/feed');
            // Keep previously loaded photos, songs and older pages while
            // refreshing the newest records after a Realtime insert.
            mergeFeedRows(freshFeed);
            void markNotesDelivered(feed.filter(item => item.kind === 'note'));
            if (page === 'notes') {
              renderNotesPage();
              void refreshOwnNoteSeenStatus();
            } else if (page === 'home') render();
          } catch (error) {
            console.warn('Live Notes update could not refresh the feed:', error?.message || error);
          }
        }, 0);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'note_delivery_receipts', filter: 'owner_id=eq.' + me.id }, () => {
        clearTimeout(window.cuteNoteDeliveryRefresh);
        window.cuteNoteDeliveryRefresh = setTimeout(() => { void refreshOwnNoteSeenStatus(); }, 45);
      })      .on('postgres_changes', { event: '*', schema: 'public', table: 'memory_reactions' }, payload => {
        const changed = payload?.new || payload?.old || {};
        const memoryId = String(changed.memory_id || '');
        const item = feed.find(memory => String(memory.id) === memoryId);
        if (!item) return;
        clearTimeout(window.cuteMemoryReactionsRefresh);
        window.cuteMemoryReactionsRefresh = setTimeout(async () => {
          try {
            const { data, error } = await sb.from('memory_reactions')
              .select('memory_id,user_id,emoji,created_at')
              .eq('memory_id', item.id);
            if (error) throw error;
            item.reactions = data || [];
            if (page === 'notes') renderNotesPage();
            else if (page === 'home') render();
          } catch (error) {
            console.warn('Live message reactions could not refresh:', error?.message || error);
          }
        }, 80);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memory_likes' }, () => {
        clearTimeout(window.cuteMemoryLikesRefresh);
        window.cuteMemoryLikesRefresh = setTimeout(() => {
          refreshMemoryLikeIndicators().catch(error => console.warn('Live like refresh failed:', error?.message || error));
          Promise.all([
            fetchFriendHeartCounts([me.id]).then(counts => {
              if (!counts) return;
              me.heartCount = counts.get(String(me.id)) ?? 0;
              const ownProfileOpen = $('#friendProfileGate') &&
                !$('#friendProfileGate').classList.contains('hidden') &&
                $('#friendProfileGate').dataset.ownProfile === 'true';
              if (ownProfileOpen) {
                const heartLabel = $('#friendProfileHearts');
                if (heartLabel) heartLabel.textContent = Number(me.heartCount).toLocaleString() + ' heart';
              }
            }),
            api('/following').then(rows => {
              friends = rows;
              syncPresenceUI();

              if (page === 'friends') render();
              const openProfile = $('#friendProfileGate');
              if (openProfile && !openProfile.classList.contains('hidden') && openProfile.dataset.ownProfile !== 'true') {
                const viewedFriend = friends.find(friend => friend.username === openProfile.dataset.username);
                if (viewedFriend) {
                  const heartLabel = $('#friendProfileHearts');
                  if (heartLabel) heartLabel.textContent = viewedFriend.heartCount == null ? '— heart' : Number(viewedFriend.heartCount).toLocaleString() + ' heart';
                }
              }
            })
          ]).catch(error => console.warn('Friend heart totals could not refresh:', error?.message || error));
        }, 90);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'note_read_cursors', filter: 'owner_id=eq.' + me.id }, () => {
        clearTimeout(window.cuteNoteSeenRefresh);
        window.cuteNoteSeenRefresh = setTimeout(() => { void refreshOwnNoteSeenStatus(); }, 40);
      }).subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('Live Notes channel status:', status);
        }
      });
  } catch (error) {
    presenceStatus = 'error';
    console.info('Realtime will start when supported.', error?.message || '');
    syncPresenceUI();
    schedulePresenceReconnect('channel-setup-failed');
  }
}

window.addEventListener('online', () => {
  if (!sb || !me) return;
  // Rejoin Supabase Realtime after the browser regains connectivity, then
  // reconcile missed messages, reactions and receipts from the database.
  startRealtime();
  void refresh().then(() => refreshOwnNoteSeenStatus())
    .catch(error => console.warn('Notes reconnect refresh failed:', error?.message || error));
});

function closeRealtime() {
  stopNotesTyping();
  remoteTypingUsers.forEach(entry => clearTimeout(entry.timer));
  remoteTypingUsers.clear();
  syncNotesTypingIndicator();
  [presenceChannel, notesActivityChannel, notesTypingChannel, notificationChannel, memoryChannel, profileChannel, noteReadCursorChannel, bearRealtimeChannel, bearRealtimePartnerChannel].forEach(channel => {
    if (channel && sb) sb.removeChannel(channel);
  });

  presenceChannel = notesActivityChannel = notesTypingChannel = notificationChannel = memoryChannel = profileChannel = noteReadCursorChannel = bearRealtimeChannel = bearRealtimePartnerChannel = null;
  bearRealtimeTopic = bearRealtimePartnerTopic = '';
  notesActivityChannelReady = false;
  pendingNotesPageTransitions = [];
  clearTimeout(seenStatusRefreshTimer);
  seenStatusRefreshTimer = null;
  notesTypingChannelReady = false;
  notesTypingQueuedState = null;
  presenceStatus = 'closed';
  presenceClientGeneration += 1;
  clearInterval(presenceHeartbeatTimer);
  clearTimeout(presenceReconnectTimer);
  presenceHeartbeatTimer = null;
  presenceReconnectTimer = null;
  // Preserve the retry count across reconnect attempts; reset only after a
  // Presence channel has successfully subscribed and tracked its state.
  presenceLastSuccessfulTrackAt = 0;
  lastPublishedPresencePage = null;
  knownOnlineFriendKeys = new Set();
  knownNotesFriendKeys = new Set();
  presenceSnapshotInitialized = false;
  lastPresenceUiPage = null;
  lastPresenceSweepKey = '';
  lastPresenceSweepAt = 0;
  if (streakCountdownInterval) {
    window.clearInterval(streakCountdownInterval);
    streakCountdownInterval = null;
  }
}

function schedulePresenceReconnect(reason = 'connection-lost') {
  if (!sb || !me || presenceReconnectTimer || presenceStatus === 'connecting') return;
  const attempt = Math.min(presenceReconnectAttempts++, 8);
  const delay = Math.min(PRESENCE_RECONNECT_MAX_MS,
    PRESENCE_RECONNECT_BASE_MS * Math.pow(2, attempt));
  const jitteredDelay = Math.round(delay * (0.8 + Math.random() * 0.4));
  console.warn('Presence reconnect scheduled:', reason, 'in', jitteredDelay, 'ms');
  presenceReconnectTimer = setTimeout(() => {
    presenceReconnectTimer = null;
    if (!me || !sb || document.hidden || presenceStatus === 'ready' || presenceStatus === 'connecting') return;
    startRealtime();
  }, jitteredDelay);
}

function normalizePresenceFriendKey(friend) {
  const id = String(friend?.id || friend?.user_id || '').trim();
  const username = String(friend?.username || '').trim().toLowerCase();
  return id ? 'id:' + id : username ? 'username:' + username : '';
}

function getPresenceSessionsForFriend(friend, sessionsById, sessionsByUsername) {
  const id = String(friend?.id || friend?.user_id || '').trim();
  const username = String(friend?.username || '').trim().toLowerCase();
  return [...new Set([
    ...(id ? sessionsById.get(id) || [] : []),
    ...(username ? sessionsByUsername.get(username) || [] : [])
  ])];
}

function isPresenceUserOnline(userOrId, state) {
  if (!userOrId || !state || typeof state !== 'object') return false;
  const targetId = typeof userOrId === 'object'
    ? String(userOrId.id || userOrId.user_id || '')
    : String(userOrId);
  const targetUsername = typeof userOrId === 'object'
    ? String(userOrId.username || '').trim().toLowerCase()
    : '';
  return Object.entries(state).some(([presenceKey, sessions]) =>
    Array.isArray(sessions) && sessions.some(session => {
      const sessionId = String(session?.user_id || session?.userId || session?.profile_id || session?.id || '');
      const sessionUsername = String(session?.username || '').trim().toLowerCase();
      const keyMatches = !!targetId && (
        presenceKey === targetId ||
        presenceKey.startsWith('cb-' + targetId + '-') ||
        presenceKey.startsWith(targetId + ':')
      );
      return (!!targetId && sessionId === targetId) ||
        (!!targetUsername && sessionUsername === targetUsername) ||
        keyMatches;
    })
  );
}

const presenceSweepRecentEvents = new Map();
const presenceSweepQueue = [];
let presenceSweepRunning = false;
let pendingPresenceSweepWhileHidden = false;

function triggerFriendPresenceSweep(friendKey, transition) {
  const transitionName = String(transition || 'activity');
  const transitionGroup = ['entered', 'notes-entered', 'online'].includes(transitionName) ? 'arrived'
    : ['left', 'notes-left', 'offline'].includes(transitionName) ? 'departed' : transitionName;
  const key = String(friendKey || 'friend') + ':' + transitionGroup;
  const now = Date.now();
  // Collapse duplicate Presence/Broadcast reports, but retain distinct rapid
  // transitions so a quick switch into/out of Notes is still animated.
  if (now - (presenceSweepRecentEvents.get(key) || 0) < 700) return;
  presenceSweepRecentEvents.set(key, now);
  if (presenceSweepRecentEvents.size > 100) {
    for (const [eventKey, at] of presenceSweepRecentEvents) {
      if (now - at > 10000) presenceSweepRecentEvents.delete(eventKey);
    }
  }
  lastPresenceSweepKey = key;
  lastPresenceSweepAt = now;
  // Background tabs can throttle or finish CSS animations before the user
  // sees them. Remember the activity and replay one sweep on return.
  if (document.hidden) {
    pendingPresenceSweepWhileHidden = true;
    return;
  }
  pendingPresenceSweepWhileHidden = false;
  triggerHeaderActivitySweep();
}

function flushPendingPresenceSweep() {
  if (document.hidden || !pendingPresenceSweepWhileHidden) return;
  pendingPresenceSweepWhileHidden = false;
  triggerHeaderActivitySweep();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  // Reconcile the authoritative snapshot first; a missed join/leave is caught
  // here, then any activity already observed while hidden is replayed once.
  syncPresenceUI('visibility-resume');
  flushPendingPresenceSweep();
});

function triggerHeaderActivitySweep() {
  if (!document.body) return;
  let sweep = document.getElementById('cb-presence-sweep');
  if (!sweep) {
    sweep = document.createElement('span');
    sweep.id = 'cb-presence-sweep';
    sweep.setAttribute('aria-hidden', 'true');
    document.body.appendChild(sweep);
  }
  if (presenceSweepRunning) {
    if (presenceSweepQueue.length < 12) presenceSweepQueue.push(true);
    return;
  }
  const playNext = () => {
    presenceSweepRunning = true;
    sweep.classList.remove('is-active');
    void sweep.offsetWidth;
    sweep.classList.add('is-active');
    notesHeaderActivityTimer = setTimeout(() => {
      sweep.classList.remove('is-active');
      if (presenceSweepQueue.length) {
        presenceSweepQueue.shift();
        playNext();
      } else {
        presenceSweepRunning = false;
        notesHeaderActivityTimer = null;
      }
    }, 950);
  };
  playNext();
}





async function updateMyPresencePage() {
  if (!presenceChannel || presenceStatus !== 'ready' || !me) return;
  const channel = presenceChannel;

  // Keep Presence metadata as the source of truth for online status and active
  // page. Publish a separate broadcast only when this client crosses Notes.
  presenceTrackQueue = presenceTrackQueue.catch(() => {}).then(async () => {
    if (presenceChannel !== channel || presenceStatus !== 'ready') return;
    const nextPage = document.hidden ? 'away' : page;
    const payload = {
      user_id: me.id,
      userId: me.id,
      username: me.username,
      display_name: me.displayName || me.display_name || me.username,
      online_at: new Date().toISOString(),
      active_page: nextPage,
      is_typing: typingActive && nextPage === 'notes',
      typing_at: Date.now()
    };

    // A stalled Realtime transport must not block every later page update.
    // Bound each track attempt so the heartbeat can recover a half-open socket.
    let trackTimeout;
    try {
      await Promise.race([
        channel.track(payload),
        new Promise((_, reject) => {
          trackTimeout = setTimeout(() => reject(new Error('Presence track timed out after 8 seconds')), 8000);
        })
      ]);
    } finally {
      clearTimeout(trackTimeout);
    }
    if (presenceChannel !== channel || presenceStatus !== 'ready') return;
    presenceLastSuccessfulTrackAt = Date.now();
    const previousPage = lastPublishedPresencePage;
    lastPublishedPresencePage = nextPage;

    if (previousPage !== null && previousPage !== nextPage &&
        (previousPage === 'notes' || nextPage === 'notes')) {
      void sendNotesPageTransition({
        user_id: String(me.id),
        username: String(me.username || ''),
        transition: nextPage === 'notes' ? 'entered' : 'left',
        from_page: previousPage,
        to_page: nextPage,
        occurred_at: Date.now()
      });
    }
  });

  try {
    await presenceTrackQueue;
    syncPresenceUI('local-track');
  } catch (error) {
    // Release the serial queue after a failed/timed-out track so future
    // heartbeats are not chained behind a permanently pending promise.
    presenceTrackQueue = Promise.resolve();
    presenceStatus = 'error';
    presenceLastSuccessfulTrackAt = 0;
    console.warn('Presence page update failed:', error?.message || error);
    syncPresenceUI();
    schedulePresenceReconnect('presence-track-failed');
  }
}

function syncPresenceUI(presenceEvent = 'local') {
  let state = {};
  try { state = presenceChannel?.presenceState?.() || {}; } catch {}
  const allSessions = Object.values(state || {}).flatMap(sessions => Array.isArray(sessions) ? sessions : []);
  const sessionsById = new Map();
  const sessionsByUsername = new Map();
  Object.entries(state || {}).forEach(([presenceKey, sessions]) => {
    if (!Array.isArray(sessions)) return;
    sessions.forEach(session => {
      const id = String(session?.user_id || session?.userId || session?.profile_id || session?.id || '').trim();
      const username = String(session?.username || '').trim().toLowerCase();
      if (id) {
        if (!sessionsById.has(id)) sessionsById.set(id, []);
        sessionsById.get(id).push(session);
      }
      if (username) {
        if (!sessionsByUsername.has(username)) sessionsByUsername.set(username, []);
        sessionsByUsername.get(username).push(session);
      }
      const keyMatch = presenceKey.match(/^cb-(.+?)-[0-9a-f-]{20,}$/i);
      if (keyMatch) {
        const keyId = keyMatch[1];
        if (!sessionsById.has(keyId)) sessionsById.set(keyId, []);
        sessionsById.get(keyId).push(session);
      }
    });
  });

  const notesNow = new Set();
  (Array.isArray(friends) ? friends : []).forEach(friend => {
    const friendId = String(friend?.id || friend?.user_id || '');
    const username = String(friend?.username || '').trim().toLowerCase();
    if (!friendId && !username) return;
    // Never treat this user's own session as a friend activity event.
    if ((me?.id && friendId === String(me.id)) ||
        (me?.username && username === String(me.username).trim().toLowerCase())) return;
    const matches = getPresenceSessionsForFriend(friend, sessionsById, sessionsByUsername);
    if (matches.some(session =>
      String(session?.active_page || session?.activePage || session?.current_page || session?.currentPage || session?.page || '').trim().toLowerCase() === 'notes'
    )) {
      notesNow.add(friendId || username);
    }
  });

  // Reconcile both online status and Notes location from the authoritative
  // Presence snapshot. Broadcasts provide instant Notes transitions; this
  // snapshot comparison is the safety net for missed/reordered broadcasts.
  const onlineNow = new Set();
  (Array.isArray(friends) ? friends : []).forEach(friend => {
    const id = String(friend?.id || friend?.user_id || '');
    const username = String(friend?.username || '').trim().toLowerCase();
    const key = normalizePresenceFriendKey(friend);
    if (!key) return;
    const sessions = getPresenceSessionsForFriend(friend, sessionsById, sessionsByUsername);
    if (sessions.length) onlineNow.add(key);
  });

  const previousOnline = knownOnlineFriendKeys;
  const previousNotes = knownNotesFriendKeys;
  if (presenceSnapshotInitialized) {
    onlineNow.forEach(key => {
      if (!previousOnline.has(key)) triggerFriendPresenceSweep(key, 'online');
    });
    previousOnline.forEach(key => {
      if (!onlineNow.has(key)) triggerFriendPresenceSweep(key, 'offline');
    });
    if (page === 'notes' && !document.hidden) {
      notesNow.forEach(key => {
        if (!previousNotes.has(key)) triggerFriendPresenceSweep(key, 'notes-entered');
      });
      previousNotes.forEach(key => {
        if (!notesNow.has(key)) triggerFriendPresenceSweep(key, 'notes-left');
      });
    }
  } else if (onlineNow.size) {
    // When this client first comes online, show the activity sweep if a
    // friend was already online; do not require a fresh join event.
    triggerFriendPresenceSweep([...onlineNow][0], 'online');
  }

  // If we navigate into Notes after a friend is already there, there will be
  // no new remote event. Reconcile the existing snapshot on our page entry.
  if (page === 'notes' && !document.hidden &&
      lastPresenceUiPage !== 'notes' && notesNow.size) {
    triggerFriendPresenceSweep([...notesNow][0], 'notes-entered');
  }
  knownOnlineFriendKeys = onlineNow;
  knownNotesFriendKeys = notesNow;
  presenceSnapshotInitialized = true;
  lastPresenceUiPage = document.hidden ? 'away' : page;

  syncNotesTypingFromPresence(state);
  const profileGate = $('#friendProfileGate');
  if (profileGate && !profileGate.classList.contains('hidden') && profileGate.dataset.username) {
    const profileUser = profileGate.dataset.ownProfile === 'true' ? me : [...friends, ...friendResults].find(user => user.username === profileGate.dataset.username);
    if (profileUser) {
      const online = isPresenceUserOnline(profileUser, state);
      const status = $('#friendProfilePresence');
      const dot = $('#friendProfilePresenceDot');
      if (status) status.textContent = online ? 'Active now' :
        presenceStatus === 'ready' ? formatFriendProfileActivity(profileUser.last_active_at) : 'Checking activity…';
      dot?.classList.toggle('is-online', online);
      dot?.classList.toggle('is-offline', !online);
      dot?.setAttribute('aria-label', online ? 'Online' : 'Offline');
    }
  }
  document.querySelectorAll('.sg-friend-card[data-friend-id], .friend-row[data-friend-id]').forEach(node => {
    const nodeUser = [...friends, ...friendResults, ...(me ? [me] : [])].find(user =>
      String(user.id) === String(node.dataset.friendId) ||
      (node.dataset.profile && String(user.username || '').toLowerCase() === String(node.dataset.profile).toLowerCase())
    );
    const online = isPresenceUserOnline(nodeUser || node.dataset.friendId, state);
    node.classList.toggle('is-online', online);
    node.classList.toggle('is-offline', !online);
    const presenceLabel = node.querySelector('.sg-friend-presence');
    if (presenceLabel) {
      const friend = nodeUser;
      presenceLabel.textContent = online ? 'Active now' :
        presenceStatus === 'ready' ? formatFriendProfileActivity(friend?.last_active_at) : 'Checking activity…';
    }
  });
}










































function formatProfileDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  if (date.getTime() > Date.now()) return 'Just joined';
  const month = new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
  return `${date.getDate()} ${month}, ${date.getFullYear()}`;
}

/* App sound preference is local to this device and takes effect immediately. */
document.addEventListener('change', event => {
  if (!event.target.matches('#notifySounds')) return;
  localStorage.setItem('cuteBunnyAppSounds', event.target.checked ? 'on' : 'off');
  toast(event.target.checked ? 'App sounds are on ♡' : 'App sounds are off');
});

/* Event listeners */

// Soft tactile button press animation. Audio is reserved for selected moments.
const buttonPressTimers = new WeakMap();
function releaseCuteButton(button) {
  if (!button) return;
  button.classList.remove('cute-press');
  const timer = buttonPressTimers.get(button);
  if (timer) clearTimeout(timer);
  buttonPressTimers.delete(button);
}
document.addEventListener('pointerdown', event => {
  const button = event.target.closest('button:not(:disabled), [role="button"]:not([aria-disabled="true"])');
  if (!button || event.button > 0 || button.matches('#surprise, #bunnyBuddy, .sg-petal-card') || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  button.classList.remove('cute-press');
  void button.offsetWidth;
  button.classList.add('cute-press');
  const timer = setTimeout(() => releaseCuteButton(button), 190);
  buttonPressTimers.set(button, timer);
}, true);
document.addEventListener('pointerup', event => {
  const button = event.target.closest('button, [role="button"]');
  if (button) setTimeout(() => releaseCuteButton(button), 95);
}, true);
document.addEventListener('pointercancel', event => {
  const button = event.target.closest('button, [role="button"]');
  if (button) releaseCuteButton(button);
}, true);
// Tapping effect on pointerdown
document.addEventListener('pointerup', e => {
  const interactive = e.target.closest('button, .primary, .round, .tile, .ig-note-item, .feed-photo, .bunny-button, .daily, [data-go], #nav button');
  if (!interactive || e.target.closest('input, textarea, select')) return;
  interactive.classList.remove('cute-tap');
  void interactive.offsetWidth;
  interactive.classList.add('cute-tap');
  setTimeout(() => interactive.classList.remove('cute-tap'), 360);

  const rect = interactive.getBoundingClientRect();
  const x = e.clientX || (rect.left + rect.width / 2);
  const y = e.clientY || (rect.top + rect.height / 2);

}, { passive: true });


document.addEventListener('submit', e => {
  if (e.target.id !== 'streakGoalForm') return;
  e.preventDefault();
  const label = String($('#streakGoalInput')?.value || '').trim();
  if (!label) return;
  const goals = readStreakGoals();
  if (goals.length >= 6) return toast('Keep up to six little goals at a time ♡');
  goals.push({id:'goal-' + Date.now(), label});
  writeStreakGoals(goals);
  renderStreakPage();
  toast('A little goal has been planted ♡');
});
document.addEventListener('change', e => {
  const box = e.target.closest('[data-streak-goal]');
  if (!box) return;
  const today = new Date().toISOString().slice(0,10);
  const checks = readStreakGoalChecks(today);
  checks[box.dataset.streakGoal] = box.checked;
  try { localStorage.setItem(streakStorageKey('checks:' + today), JSON.stringify(checks)); } catch {}
  updateStreakGoalProgress();
});

// Bear Hugs mini-game: action animations sync live with the selected friend; the affection meter stays local.
const bearLoveStorageKey = 'cuteBunnyBearLove:v1';
const bearSoundStorageKey = 'cuteBunnyBearSounds:v1';
function readBearLoveCount() {
  try { return Math.max(0, Number(localStorage.getItem(bearLoveStorageKey)) || 0); }
  catch { return 0; }
}
function updateBearLoveMeter() {
  const count = readBearLoveCount();
  const level = count < 100 ? { level: 1, previous: 0, next: 100 }
    : count < 150 ? { level: 2, previous: 100, next: 150 }
    : count < 200 ? { level: 3, previous: 150, next: 200 }
    : count < 350 ? { level: 4, previous: 200, next: 350 }
    : (() => { const current = 5 + Math.floor((count - 350) / 300); const previous = 350 + (current - 5) * 300; return { level: current, previous, next: previous + 300 }; })();
  const progress = Math.max(0, Math.min(100, ((count - level.previous) / (level.next - level.previous)) * 100));
  const label = $('#bearLoveCount');
  const fill = $('#bearLoveFill');
  if (label) label.textContent = 'Level ' + level.level + ' · ' + count + ' love points';
  if (fill) fill.style.width = progress + '%';
  const soundButton = $('#bearSoundToggle');
  if (soundButton) {
    const enabled = localStorage.getItem(bearSoundStorageKey) !== 'off';
    soundButton.setAttribute('aria-pressed', String(enabled));
    soundButton.setAttribute('aria-label', enabled ? 'Turn bear sounds off' : 'Turn bear sounds on');
    soundButton.textContent = enabled ? '♫ Sound on' : '♫ Sound off';
  }
}

// Bear Hugs articulated SVG animation engine — embedded in the existing Home experience.
let bearPoseEngine = null;
function destroyBearPoseEngine() {
  if (bearPoseEngine) {
    bearPoseEngine.destroy();
    bearPoseEngine = null;
  }
}
function initBearPoseEngine() {
  const svg = $('#bearPoseSvg');
  if (!svg) return;
  destroyBearPoseEngine();
  bearPoseEngine = createBearPoseEngine(svg);
}
function bearActorIndex(gender) {
  return String(gender || '').toLowerCase() === 'female' ? 1 : 0;
}
function createBearPoseEngine(svg) {
  "use strict";
  const $B = id => svg.querySelector('#' + id);
  const R=Math.PI/180,G=318,CX=[200,400],S=[1,-1],L1=24,L2=20,NAME=["Brown Bear","White Bear"];
  const COL=[{fur:"#9b6a47",st:"#6e4529",bel:"#c99a74",muz:"#e9cfb3",ear:"#d79a86",bow:"#8d7bd0"},
  {fur:"#fffaf3",st:"#dcc5b4",bel:"#fffdf9",muz:"#f6e6dc",ear:"#f7c3d1",bow:"#ef8fb1"}];
  const ACTS=[["hug","🤗","Hug"],["kiss","💋","Kiss"],["flykiss","😘","Flying Kiss"],["slap","🖐️","Playful Slap"],["hands","🫶","Hold Hands"],["feed","🍓","Feed"],["sleep","💤","Sleep"],["dance","💃","Dance"],["pet","🐾","Pet"],["tummy","🫳","Scratch Tummy"],["idle","🌸","Relax"]];
  const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??false;
  let active=true,rafId=0,snd=localStorage.getItem(bearSoundStorageKey)!=="off";
  function bear(i){const c=COL[i],st=`stroke="${c.st}" stroke-width="2.6"`;
const arm=n=>`<path id="${n}${i}o" fill="none" stroke="${c.st}" stroke-width="24.5" stroke-linecap="round" stroke-linejoin="round"/><circle id="${n}${i}co" r="14.2" fill="${c.st}"/><path id="${n}${i}f" fill="none" stroke="${c.fur}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><g id="${n}${i}p"><circle r="12" fill="${c.fur}"/><ellipse cx="-3.5" cy="-3.5" rx="4.5" ry="3" fill="#fff" opacity=".25"/></g>`;
const eye=k=>`<g id="e${i}${k}"><ellipse id="ee${i}${k}" rx="4.4" ry="5.4" fill="#3d2f2d"/><circle cx="1.4" cy="-1.8" r="1.7" fill="#fff"/><path id="ea${i}${k}" fill="none" stroke="#3d2f2d" stroke-width="2.4" stroke-linecap="round" opacity="0"/></g>`;
return `<ellipse id="sh${i}" cy="${G+8}" rx="48" ry="8" fill="#9a6a86" opacity=".16"/>
<g id="s${i}"><g id="p${i}"><g id="bd${i}">
<g id="lg${i}l"><ellipse cx="-22" cy="-13" rx="19" ry="14" fill="${c.fur}" ${st}/><ellipse cx="-22" cy="-10" rx="9.5" ry="6.5" fill="${c.ear}" opacity=".85"/></g>
<g id="lg${i}r"><ellipse cx="22" cy="-13" rx="19" ry="14" fill="${c.fur}" ${st}/><ellipse cx="22" cy="-10" rx="9.5" ry="6.5" fill="${c.ear}" opacity=".85"/></g>
<ellipse cy="-50" rx="38" ry="40" fill="${c.fur}" ${st}/><ellipse cy="-46" rx="24" ry="28" fill="${c.bel}"/></g>
<g id="a${i}">${arm("o"+0)}${arm("i"+0)}</g>
<g id="h${i}"><circle cx="-43" cy="-76" r="15" fill="${c.fur}" ${st}/><circle cx="43" cy="-76" r="15" fill="${c.fur}" ${st}/><circle cx="-43" cy="-76" r="8" fill="${c.ear}"/><circle cx="43" cy="-76" r="8" fill="${c.ear}"/>
<ellipse cy="-38" rx="58" ry="48" fill="${c.fur}" ${st}/>
${i?`<g transform="translate(40 -88) rotate(20)"><path d="M0 0L-13-8 -13 8Z M0 0L13-8 13 8Z" fill="${c.bow}" stroke="#d3688f" stroke-width="1.5" stroke-linejoin="round"/><circle r="4" fill="#f9b6cd"/></g>`:""}
<ellipse id="bl${i}l" cx="-39" cy="-27" rx="10" ry="6" fill="#ff8fb0" opacity=".5"/><ellipse id="bl${i}r" cx="39" cy="-27" rx="10" ry="6" fill="#ff8fb0" opacity=".5"/>
<ellipse cy="-26" rx="15" ry="10.5" fill="${c.muz}"/><ellipse cy="-30" rx="5" ry="3.4" fill="#4a3433"/><circle cx="-1.3" cy="-31" r="1" fill="#fff" opacity=".7"/>
<path id="mo${i}" transform="translate(0 -22)" fill="#b2606d" stroke="#4a3433" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
${eye("l")}${eye("r")}</g></g></g>`}
svg.innerHTML=`<defs><radialGradient id="gl" cx=".5" cy=".4"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<ellipse cx="300" cy="150" rx="280" ry="150" fill="url(#gl)"/>
<path d="M0 270Q110 215 230 262T440 250T600 240V380H0Z" fill="#f6d6e4" opacity=".75"/><path d="M0 300Q140 255 300 290T600 280V380H0Z" fill="#eadcf7" opacity=".8"/>
<g fill="#fff" opacity=".7"><ellipse cx="150" cy="160" rx="38" ry="12"/><ellipse cx="176" cy="152" rx="24" ry="12"/><ellipse cx="450" cy="172" rx="42" ry="12"/><ellipse cx="478" cy="163" rx="24" ry="11"/></g>
<ellipse cx="300" cy="${G+10}" rx="280" ry="36" fill="#fdeedd" stroke="#e9c6da" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round"/>
<ellipse id="pil" cx="300" cy="${G-14}" rx="112" ry="22" fill="#f7d3e2" stroke="#e5b2c9" stroke-width="2.5" opacity="0"/>
<g id="bears">${bear(0)}${bear(1)}<g id="tummyBackArm" opacity="0" pointer-events="none"><path id="tummyBackArmOutline" fill="none" stroke="#6e4529" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/><path id="tummyBackArmFill" fill="none" stroke="#9b6a47" stroke-width="21" stroke-linecap="round" stroke-linejoin="round"/><g id="tummyBackPaw"><circle r="12.5" fill="#9b6a47" stroke="#6e4529" stroke-width="2.2"/><ellipse cx="-7" cy="-8" rx="4" ry="3.2" fill="#9b6a47" stroke="#6e4529" stroke-width="1.3"/><ellipse cx="0" cy="-10" rx="4" ry="3.2" fill="#9b6a47" stroke="#6e4529" stroke-width="1.3"/><ellipse cx="7" cy="-8" rx="4" ry="3.2" fill="#9b6a47" stroke="#6e4529" stroke-width="1.3"/><path d="M-4 2Q0 5 4 2" fill="none" stroke="#d7a58a" stroke-width="1.4" stroke-linecap="round"/></g></g></g><g font-family="Nunito,Segoe UI,sans-serif" font-size="10" font-weight="800" fill="#8b6a7e" text-anchor="middle"></g>
<rect id="blk" x="0" y="0" width="600" height="400" fill="#5b4a9a" fill-opacity=".24" opacity="0" pointer-events="none"/>
<g id="berry" opacity="0"><path d="M0 -10C-12 -11 -14 3 -8 11 -4 17 4 17 8 11 14 3 12 -11 0 -10Z" fill="#f0455f"/><g fill="#ffe7a8"><circle cx="-4" cy="0" r="1.2"/><circle cx="4" cy="-2" r="1.2"/><circle cx="0" cy="6" r="1.2"/><circle cx="5" cy="7" r="1.2"/><circle cx="-6" cy="8" r="1.2"/></g><path d="M0-10L-7-14 -3-9 0-15 3-9 7-14Z" fill="#6fbf73"/></g>
<g id="fx"></g>`;

  /* ---------- pose engine ---------- */
const K=["x","y","rot","hr","hx","hy","eye","eh","mouth","pk","blush","i1","i2","o1","o2"];
const P=[0,1].map(()=>({x:0,y:0,rot:0,hr:0,hx:0,hy:0,eye:1,eh:1,mouth:0,pk:0,blush:.3,i1:-12,i2:-6,o1:12,o2:6}));
const ptL=(b,lx,ly)=>{const p=P[b],r=p.rot*R,vy=ly+50;return[CX[b]+S[b]*(p.x+lx*Math.cos(r)-vy*Math.sin(r)),G+p.y+lx*Math.sin(r)+vy*Math.cos(r)-50]};
const ptH=(b,hx,hy)=>{const p=P[b],r=p.hr*R;return ptL(b,p.hx+hx*Math.cos(r)-hy*Math.sin(r),-70+p.hy+hx*Math.sin(r)+hy*Math.cos(r))};
const toL=(b,wx,wy)=>{const p=P[b],r=p.rot*R,x1=S[b]*(wx-CX[b])-p.x,y1=wy-G-p.y+50;return[x1*Math.cos(r)+y1*Math.sin(r),-x1*Math.sin(r)+y1*Math.cos(r)-50]};
function ik(tx,ty){const sx=28,sy=-76;let dx=tx-sx,dy=ty-sy,d=Math.hypot(dx,dy);const m=L1+L2-.5;if(d>m){dx*=m/d;dy*=m/d;d=m}d=Math.max(d,10);
const tb=Math.atan2(-dx,dy),al=Math.acos(Math.max(-1,Math.min(1,(L1*L1+d*d-L2*L2)/(2*L1*d))));let best;
for(const g of[1,-1]){const a=tb+g*al,ex=sx-L1*Math.sin(a),ey=sy+L1*Math.cos(a);if(!best||ey>best.ey)best={a,ex,ey}}
const tt=Math.atan2(-(sx+dx-best.ex),sy+dy-best.ey);let a2=(tt-best.a)/R;a2=((a2+540)%360)-180;return[best.a/R,a2]}
const fk=(s,a1,a2)=>{const t1=a1*R,t2=(a1+a2)*R,ex=s-L1*Math.sin(t1),ey=-76+L1*Math.cos(t1);return[[s,-76],[ex,ey],[ex-L2*Math.sin(t2),ey+L2*Math.cos(t2)],t2/R]};

const V=[{},{}],EXP={eye:1,eh:1,mouth:1,pk:1,blush:1};let cur="idle",actor=0,role=0,t0=performance.now(),sleepF=0,berryS=1,rate=7;
const idle=(b,t)=>{const w=Math.sin(t*1.2+b*1.7),curious=Math.max(0,Math.sin(t*.19+b*2.4)),stretch=Math.max(0,Math.sin(t*.075+b*3.1));return{x:Math.sin(t*.32+b*1.8)*1.4,y:-stretch*1.2,rot:w*1.35+curious*(b?-.8:.8),hr:Math.sin(t*.8+b*2.3)*3.2+2+curious*(b?-2.2:2.2),hx:0,hy:0,eye:1,eh:1,mouth:0,pk:0,blush:.3,i1:-12+w*2-stretch*3,i2:-6,o1:12-w*2+stretch*3,o2:6}};
const BITES=[1.4,2.8,4.0];
const ACT={
idle:()=>({}),
flykiss:(t,b)=>{const other=1-actor,phase=t<.72?0:t<1.42?1:2,flutter=Math.sin(t*8);if(b===actor){const mouth=ptH(actor,0,-28),target=ptH(other,0,-34),point=phase===0?mouth:target;return{x:58+Math.sin(t*2)*1.2,rot:2,hr:phase===0?8:phase===1?19:5,hx:phase===1?12:0,eye:1,mouth:.25,blush:.82,ik:phase<2?[point[0],point[1]+(phase===1?flutter*1.6:0)]:null,i1:-28,i2:-12,o1:phase===1?30:18,o2:phase===1?20:10}}return{x:58,y:Math.abs(flutter)*.8,rot:Math.sin(t*5)*.8,hr:t>1.05?-5:0,eye:t>1.05?.12:1,mouth:.48,blush:.98,i1:-24,i2:-10,o1:24,o2:10}},
slap:(t,b)=>{const other=1-actor,impact=t>.82&&t<1.18,cheek=ptH(other,other===0?-32:32,-34),recoil=t>.86&&t<1.9;if(b===actor){return{x:68,rot:3,hr:t<.55?8:impact?24:8,hx:impact?16:0,eye:1,mouth:.22,blush:.6,ik:t>.32&&t<1.22?[cheek[0],cheek[1]+(impact?Math.sin(t*34)*1.5:0)]:null,i1:-28,i2:-12,o1:impact?34:18,o2:impact?22:10}}const kick=recoil?Math.sin((t-.86)*17):0;return{x:66+kick*5,y:Math.abs(kick)*1.2,rot:recoil?-kick*2.8:0,hr:recoil?-12-kick*3:0,eye:recoil?.12:1,mouth:recoil?.7:.15,blush:recoil?1:.45,i1:-24,i2:-10,o1:24,o2:10}},
tummy:(t,b)=>{const sw=Math.sin(t*9),rub=t>.45&&t<4.05;if(b===actor){return{x:75+Math.sin(t*2)*1.2,rot:3,hr:rub?22+sw*2:9,hx:rub?20:6,eye:1,mouth:.22,blush:.65,i1:-16,i2:-8,o1:18,o2:8}}return{x:75,y:Math.abs(sw)*1.4,rot:Math.sin(t*9)*1.1,hr:-8+Math.sin(t*9)*2,eye:rub?.18:1,mouth:.42,blush:.95,i1:-24,i2:-10,o1:24,o2:10}},
hug:(t,b)=>{const o=1-b,sq=t>1.4?Math.sin((t-1.4)*3.2):0,r={x:64+2*sq,y:-2.5*Math.abs(sq),rot:2,hr:12,hx:-18,hy:2*sq,eye:t>.9?.1:1,mouth:.1,blush:.9,o1:30,o2:20};
 if(t<.6)Object.assign(r,{i1:-82,i2:-8,o1:82,o2:8,hr:3,hx:0,x:36,y:-5*Math.abs(Math.sin(t*5))});else r.ik=ptL(o,-6,-58);return r},
kiss:(t,b)=>{const a=actor,o=1-a,go=t>.8&&t<2.6;
 if(b===a)return{x:go?68:50,rot:go?6:0,hr:go?22:5,hx:go?32:0,eye:go?.1:1,mouth:go?.3:.1,pk:go?1:0,blush:.7,ik:t>.4?ptL(o,-14,-66):null,i1:-40,i2:-10};
 const sh=t>1.2&&t<2.9;return{x:50,hr:sh?-4:6,hy:sh?-3:0,eye:t>1.25&&t<3?.1:1,mouth:.12,blush:t>1.2?1:.5,ik:sh?ptH(b,34,-24):null,i1:-40,i2:-10}},
hands:t=>({x:38,hr:8,eye:1,mouth:.2,blush:.7,ik:[300,G-52+Math.sin(t*2.2)*3.5],i1:-20,y:-1.5*Math.abs(Math.sin(t*2.2))}),
sleep:(t,b)=>({x:12,y:12,rot:72,hr:-48,hx:20,hy:2,eye:0,eh:0,mouth:0,blush:.45,i1:-32,i2:-12,o1:30,o2:12}),
dance:(t,b)=>{const ph=t*1.7*Math.PI,hop=Math.abs(Math.sin(ph)),sw=Math.sin(ph/2),sg=b?-1:1;
 return{x:38+12*sw*sg,y:-16*hop,rot:sg*sw*7,hr:sg*Math.sin(ph/2+.8)*10,hy:2*hop,eye:.1,mouth:.35+.4*hop,blush:.9,ik:[300+sw*10,G-98+Math.sin(ph*2)*5],o1:105+35*Math.sin(ph*2+b*Math.PI),o2:10}},
pet:(t,b)=>{const r=1-actor,sw=Math.sin(t*5);
 return b===actor?{x:64,hr:-5,hx:-8,mouth:.2,blush:.6,ik:(h=>[h[0]+sw*4,h[1]+Math.sin(t*5+1.2)*2.5])(ptH(r,-34,-50))}
 :{x:64,hr:14+sw*2,hx:16,hy:Math.abs(sw)*1.8,eye:.1,blush:1,mouth:.25}},
feed:(t,b)=>{const a=actor,r=1-a,open=(t>1.1&&t<1.7)||(t>2.65&&t<3)||(t>3.85&&t<4.2),chew=(t>1.7&&t<2.65)||(t>3&&t<3.85)||(t>4.2&&t<5.2);
 if(b===a){const k=t<.9?40:open?14:chew?34:t<5.2?34:44,M=ptH(r,0,-22);return{x:64,hr:-6,hx:-16,mouth:.25,blush:.6,ik:[M[0]-S[a]*k,M[1]+2]}}
 return{x:64,hr:open?12:chew?7:4,hx:open?8:chew?3:0,mouth:open?.9:chew?.2+.2*Math.abs(Math.sin(t*14)):t>5.2?.05:0,eye:chew?.12:1,blush:chew||t>5.2?.9:.5}},
peekaboo:(t,b)=>{const reveal=t<.8?0:t<1.25?1:Math.max(0,1-(t-1.25)*.45);if(b===actor)return{x:42,y:-2,rot:-2,hr:10+reveal*7,eye:t<1.1?0:1,mouth:.18+reveal*.28,blush:.75,o1:58-reveal*20,o2:20,i1:-34,i2:-12};return{x:38,y:-Math.max(0,Math.sin(t*3))*2,hr:-5,eye:t<.8?.12:1,mouth:.22,blush:.85}},
bump:(t,b)=>{const hit=t>.72&&t<1.05,pulse=hit?Math.sin((t-.72)*Math.PI/.33):0;return{x:42+(hit?pulse*3:0),y:hit?-Math.abs(pulse)*3:0,rot:b===actor?2+pulse*3:-2-pulse*3,hr:b===actor?8-pulse*5:-8+pulse*5,eye:hit?.2:1,mouth:.22,blush:.8}}
};
const END={kiss:3.8,flykiss:3.6,slap:2.8,feed:6.8,tummy:4.6,peekaboo:3.1,bump:2.4};


  /* ---------- audio ---------- */
let ac,master,nbuf;
function A(){if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ac=new C();master=ac.createGain();master.gain.value=(snd ? .9 : 0);master.connect(ac.destination);
 const n=ac.sampleRate*1.8|0,ib=ac.createBuffer(2,n,ac.sampleRate);for(let c=0;c<2;c++){const d=ib.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3)}
 const cv=ac.createConvolver(),wg=ac.createGain();cv.buffer=ib;wg.gain.value=.3;master.connect(wg);wg.connect(cv);cv.connect(ac.destination);
 nbuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const d=nbuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
 if(ac.state==="suspended")ac.resume();return ac}
function tone(f,d,v=.05,ty="sine",dl=0,gl=0){if(!snd)return;const c=A();if(!c)return;const t=c.currentTime+dl,o=c.createOscillator(),g=c.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);if(gl)o.frequency.exponentialRampToValueAtTime(gl,t+d);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+Math.min(.03,d/3));g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.05)}
function nz(d,v,f,ty="bandpass",dl=0,att=.01){if(!snd)return;const c=A();if(!c)return;const t=c.currentTime+dl,s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();s.buffer=nbuf;fl.type=ty;fl.frequency.value=f;fl.Q.value=.9;
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+att);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl);fl.connect(g);g.connect(master);s.start(t,Math.random());s.stop(t+d+.05)}
const kiss=()=>{tone(280,.12,.04,"sine",0,400);nz(.025,.16,3400,"bandpass",.1);tone(1250,.08,.09,"sine",.1,380);nz(.05,.08,1300,"lowpass",.11);tone(1976,.4,.022,"sine",.2);tone(2637,.3,.012,"sine",.26)};
const crunch=()=>{for(let i=0;i<4;i++)nz(.022,.2-.03*i,2200+Math.random()*2600,"bandpass",i*.04);tone(130,.09,.08,"sine",0,70)};
const chew=n=>{for(let i=0;i<n;i++){const d=i*.26;nz(.13,.07,520+Math.random()*200,"lowpass",d);tone(230,.1,.03,"sine",d,150)}};
const yum=()=>{tone(392,.14,.05,"triangle",0,350);tone(523,.22,.045,"triangle",.14,600);tone(659,.4,.035,"sine",.3)};
const box=(f,d=0,v=.03)=>{tone(f,1.5,v,"sine",d);tone(f*2,.9,v*.3,"sine",d);tone(f*3,.5,v*.12,"sine",d)};
const breath=()=>{nz(1.6,.05,620,"bandpass",0,1.2);nz(1.7,.04,400,"bandpass",1.7,.3);tone(98,3.2,.014)};
const LULL=[[784,659,587,659],[784,784,784,0],[659,659,659,0],[784,988,988,0]];
const SC=[523,587,659,784,880],MEL=[0,2,4,2,3,2,1,-1,0,2,4,3,4,2,1,-1],BASS=[131,196,220,175];
const pluck=f=>{tone(f,.22,.05,"triangle");tone(f*2,.14,.015,"sine")};
const beat=n=>{const bt=n>>1;if(n%2===0){tone(125,.2,.14,"sine",0,42);if(bt%2)nz(.1,.09,1900);tone(BASS[(bt>>1)%4],.5,.05,"triangle")}else nz(.04,.03,7500,"highpass");const m=MEL[n%16];if(m>=0)pluck(SC[m])};
const pat=n=>{tone(230,.16,.06,"sine",0,150);tone(880,.6,.012,"sine",.02);if(n%4===0)tone(330,.7,.03,"triangle",.05,392)};
let tm=[],lp=[];const later=(f,ms)=>{const id=setTimeout(f,ms);tm.push(id);return id},loop=(f,ms)=>{f(0);let n=0;lp.push(setInterval(()=>f(++n),ms))};
const mid=()=>[300,G-90];


  /* ---------- fx ---------- */
function flyFx(sym,x1,y1,x2,y2,col="#f28db5",sz=22){const e=document.createElementNS("http://www.w3.org/2000/svg","text");e.textContent=sym;e.setAttribute("x",x1);e.setAttribute("y",y1);e.setAttribute("fill",col);e.setAttribute("font-size",sz);e.setAttribute("text-anchor","middle");e.style.transformBox="fill-box";e.style.transformOrigin="center";$B("fx").appendChild(e);if(reduceMotion){e.setAttribute("x",x2);e.setAttribute("y",y2);e.setAttribute("opacity",".8");return}const dx=x2-x1,dy=y2-y1;e.animate([{transform:"translate(0,0) scale(.55)",opacity:0},{opacity:1,offset:.18},{transform:`translate(${dx}px,${dy}px) scale(1.25)`,opacity:0}],{duration:1250,easing:"cubic-bezier(.2,.7,.25,1)"}).onfinish=()=>e.remove()}
function fx(sym,x,y,col="#f4789f",sz=22){const e=document.createElementNS("http://www.w3.org/2000/svg","text");e.textContent=sym;e.setAttribute("x",x);e.setAttribute("y",y);e.setAttribute("fill",col);e.setAttribute("font-size",sz);e.setAttribute("text-anchor","middle");e.style.transformBox="fill-box";e.style.transformOrigin="center";$B("fx").appendChild(e);
 if(reduceMotion){e.setAttribute("opacity",".75");return}const dx=(Math.random()-.5)*50;e.animate([{transform:"translate(0,0) scale(.4)",opacity:0},{opacity:1,offset:.25},{transform:`translate(${dx}px,-70px) scale(1.15)`,opacity:0}],{duration:1900,easing:"ease-out"}).onfinish=()=>e.remove()}
const burst=(x,y,n=5,sym="♥")=>{for(let i=0;i<n;i++)later(()=>fx(sym,x+(Math.random()-.5)*50,y,i%2?"#f4789f":"#d79ae8",16+Math.random()*14),i*130)};


  /* ---------- actions ---------- */
const TXT=(a,by)=>{const o=1-by,n=NAME[by],m=NAME[o];return{hug:`${n} hugs ${m} 🤗`,kiss:`${n} gives ${m} a sweet kiss 💋`,hands:`${n} and ${m} hold paws 🫶`,feed:`${n} shares a strawberry with ${m} 🍓`,sleep:`${n} and ${m} drift off peacefully 💤`,dance:`${n} and ${m} are dancing together 💃`,pet:`${n} gently pets ${m} 🐾`,tummy:`${n} gives ${m} gentle tummy tickles! 🫳`,flykiss:`${n} blows ${m} a flying kiss! 💋`,slap:`${n} gives ${m} a playful little slap! 🖐️`,idle:`${n} and ${m} are relaxing 🌸`}[a]};
function start(a,by){tm.forEach(clearTimeout);lp.forEach(clearInterval);tm=[];lp=[];$B("fx").innerHTML="";
 cur=a;actor=by;t0=performance.now();rate=a==="dance"?13:a==="sleep"?4.5:7;berryS=1;
 const bears=$B("bears"),backArm=$B("tummyBackArm");if(a==="tummy"){bears.appendChild($B("s"+by));bears.appendChild(backArm);bears.appendChild($B("s"+(1-by)));}else{backArm.setAttribute("opacity","0");const ord=a==="flykiss"||a==="slap"||a==="feed"||a==="pet"||a==="kiss"?[1-by,by]:[0,1];ord.forEach(i=>bears.appendChild($B("s"+i)));}
 const scene=svg.closest(".couple-bears-scene");if(scene)scene.dataset.action=a;
 if(a==="hug"){tone(262,1.4,.04);tone(330,1.4,.035,"sine",.06);tone(392,1.5,.03,"sine",.12);later(()=>{tone(196,1,.06,"triangle");tone(523,.9,.02,"sine",.1);burst(300,G-170,5)},1250)}
 if(a==="kiss"){later(()=>{kiss();burst(300,G-170,6)},1350);later(()=>{nz(.03,.1,2500);tone(900,.06,.05,"sine",0,500)},2600)}
 if(a==="flykiss"){later(()=>{tone(740,.16,.04,"sine",0,980);tone(988,.22,.035,"sine",.12,1318);const from=ptH(by,0,-28),to=ptH(1-by,0,-34);flyFx("♡",from[0],from[1],to[0],to[1],"#ed79a5",27);later(()=>flyFx("💋",from[0],from[1]-4,to[0],to[1]-12,"#e98bad",20),180)},850)}
 if(a==="slap"){later(()=>{tone(210,.11,.07,"triangle",0,115);nz(.045,.08,1450,"bandpass",.015);const cheek=ptH(1-by,1-by===0?-32:32,-34);burst(cheek[0],cheek[1],5,"✦")},920)}
 if(a==="hands"){later(()=>{[1047,1319,1568,2093,1568].forEach((f,i)=>tone(f,.55,.025,"sine",i*.08));burst(300,G-70,5,"✦")},800)}
 if(a==="feed"){BITES.forEach((b,index)=>later(()=>{crunch();later(()=>chew(3),220);if(index===2)later(yum,500)},b*1000));later(()=>burst(CX[1-by]+S[1-by]*30,G-190,4),5600)}
 if(a==="sleep"){loop(n=>{breath();LULL[n%4].forEach((f,k)=>f&&box(f,k*.8));if(n%2===0)later(()=>fx("z",300+(Math.random()-.5)*60,G-100,"#9b86d6",20+Math.random()*10),500)},3400)}
 if(a==="dance"){loop(n=>{beat(n);if(n%4===0)fx("♪",300+(Math.random()-.5)*120,G-170,"#b08be0",22)},294)}
 if(a==="pet"){tone(300,.5,.03,"triangle");loop(n=>{pat(n);if(n%2==0){const h=ptH(1-by,0,-80);fx("♥",h[0],h[1]-20,"#f4789f",16)}},628)}
  if(a==="tummy"){tone(660,.18,.035,"sine",0,820);tone(784,.2,.03,"sine",.22,988);loop(n=>{pat(n);if(n%2===0){const side=by===0?1:-1,hx=CX[1-by]+side*(63+Math.sin(n*1.8)*2),hy=G-38+Math.sin(n*2.4)*5;fx(n%4===0?"♡":"✦",hx,hy-10,"#f28db5",14+Math.random()*5)}},420)}
 if(a==="idle"){tone(392,.7,.025,"sine",0,330)}
 if(END[a])later(()=>{if(cur===a)start("idle",by)},END[a]*1000)}

  /* ---------- render loop ---------- */
const blink=[{n:1.5,u:0},{n:3,u:0}];let last=performance.now();
const setT=(id,v)=>$B(id).setAttribute("transform",v);
function drawArm(b,n,s,a1,a2){const f=fk(s,a1,a2),d=`M${f[0][0]} ${f[0][1]}Q${f[1][0]} ${f[1][1]} ${f[2][0]} ${f[2][1]}`,id=n+0+b;
 $B(id+"o").setAttribute("d",d);$B(id+"f").setAttribute("d",d);$B(id+"co").setAttribute("cx",f[2][0]);$B(id+"co").setAttribute("cy",f[2][1]);setT(id+"p",`translate(${f[2][0]} ${f[2][1]}) rotate(${f[3]})`);return f}
function frame(now){if(!active||!svg.isConnected)return;const dt=Math.min(.05,(now-last)/1e3);last=now;const t=(now-t0)/1e3,ts=now/1e3,k=1-Math.exp(-dt*rate);
 sleepF+=((cur==="sleep"?1:0)-sleepF)*(1-Math.exp(-dt*2.5));
 const tg=[0,1].map(b=>{const o=Object.assign(idle(b,ts),ACT[cur](t,b));if(o.ik){const[a1,a2]=ik(...toL(b,o.ik[0],o.ik[1]));o.i1=a1;o.i2=a2}return o});
 for(let b=0;b<2;b++){const p=P[b],g=tg[b];for(const key of K){if(EXP[key])p[key]+=(g[key]-p[key])*(1-Math.exp(-dt*(key==="eye"?16:9)));else{const arm=key[0]==="i"||key[0]==="o",w=(arm?1.25:1)*rate*1.15,z=arm?.72:.78,vv=V[b];vv[key]=(vv[key]||0)+((g[key]-p[key])*w*w-2*z*w*(vv[key]||0))*dt;p[key]+=vv[key]*dt}}
 const br=reduceMotion?0:Math.sin(ts*(sleepF>.5?1.5:2.1)+b),bs=1+br*(.012+.02*sleepF),bl=blink[b];
 if(!reduceMotion&&ts>bl.n){bl.u=ts;bl.n=ts+2.5+Math.random()*3}const bf=!reduceMotion&&ts-bl.u<.14?.1:1;
 setT("s"+b,`translate(${CX[b]} ${G+p.y}) scale(${S[b]} 1)`);setT("p"+b,`translate(${p.x} 0) rotate(${p.rot} 0 -50)`);
 {const mv=reduceMotion?0:(cur==="dance"?1:Math.min(1,Math.abs(V[b].x||0)/22)),ph=ts*(cur==="dance"?1.7*Math.PI*2:13),ll=Math.max(0,Math.sin(ph))*mv,lr=Math.max(0,-Math.sin(ph))*mv,sp=sleepF*14;
 setT("lg"+b+"l",`translate(0 ${-ll*7}) rotate(${-ll*10-sp} -22 -22)`);setT("lg"+b+"r",`translate(0 ${-lr*7}) rotate(${lr*10+sp} 22 -22)`)}
 setT("bd"+b,`translate(0 -10) scale(1 ${bs}) translate(0 10)`);
 setT("h"+b,`translate(${p.hx} ${-70+p.hy-br*(.8+sleepF)}) rotate(${p.hr})`);
 drawArm(b,"o",-28,p.o1,p.o2);drawArm(b,"i",28,p.i1,p.i2);
 const cl=p.eye<.25,op=Math.max(.06,p.eye*bf);
 for(const e of["l","r"]){const x=e==="l"?-26:26;setT("e"+b+e,`translate(${x} -36)`);const ee=$B("ee"+b+e);ee.setAttribute("ry",5.4*op);ee.style.opacity=cl?0:1;
  const ea=$B("ea"+b+e);ea.setAttribute("d",`M-5.5 ${p.eh>.5?2:-1}Q0 ${p.eh>.5?-5:6} 5.5 ${p.eh>.5?2:-1}`);ea.style.opacity=cl?1:0;$B("bl"+b+e).style.opacity=Math.min(1,p.blush)}
 const m=Math.max(0,p.mouth),w=6.5-3.5*p.pk,tp=6*(1-m*.9),bt=6+16*m;
 $B("mo"+b).setAttribute("d",`M${-w} 0Q0 ${tp} ${w} 0Q0 ${bt} ${-w} 0Z`);
 const sh=$B("sh"+b);sh.setAttribute("cx",CX[b]+S[b]*p.x);sh.setAttribute("rx",48-p.y*.7);sh.setAttribute("opacity",.16*(1-sleepF)*(1+p.y/60))}
 const backArm=$B("tummyBackArm");if(cur==="tummy"){const side=actor===0?1:-1,target=1-actor,startX=CX[actor]+S[actor]*(P[actor].x+28),startY=G+P[actor].y-76,endX=startX+side*42,endY=startY+8+Math.sin(t*9)*3.2,controlX=(startX+endX)/2,controlY=startY+5+Math.sin(t*4)*2;const path=`M${startX} ${startY} Q${controlX} ${controlY} ${endX} ${endY}`;const c=COL[actor];$B("tummyBackArmOutline").setAttribute("d",path);$B("tummyBackArmFill").setAttribute("d",path);$B("tummyBackArmOutline").setAttribute("stroke",c.st);$B("tummyBackArmFill").setAttribute("stroke",c.fur);$B("tummyBackPaw").setAttribute("transform",`translate(${endX} ${endY}) rotate(${side*8+Math.sin(t*9)*7})`);backArm.setAttribute("opacity",t>.35&&t<4.25?"1":"0")}else backArm.setAttribute("opacity","0");
 $B("pil").setAttribute("opacity",sleepF);$B("blk").setAttribute("opacity",sleepF);
 const bs=$B("berry");if(cur==="feed"&&t<5.3){const f=fk(28,P[actor].i1,P[actor].i2),h=f[2],rad=f[3]*R,wp=ptL(actor,h[0]-Math.sin(rad)*8,h[1]+Math.cos(rad)*8),sc=t<1.7?1:t<3?.66:t<4.2?.36:0;
  berryS+=(sc-berryS)*(1-Math.exp(-dt*14));bs.setAttribute("transform",`translate(${wp[0]} ${wp[1]}) scale(${berryS*.9}) rotate(${-S[actor]*20})`);bs.setAttribute("opacity",berryS>.05?1:0)}else bs.setAttribute("opacity",0);
 rafId=requestAnimationFrame(frame)}
rafId=requestAnimationFrame(frame);
  function setSound(enabled) {
    snd=!!enabled;
    if(master&&ac&&ac.state!=="closed") {
      try { master.gain.setTargetAtTime(snd ? .9 : 0,ac.currentTime,.04); } catch {}
    }
  }
  function destroy() {
    if(!active)return;
    active=false;
    cancelAnimationFrame(rafId);
    tm.forEach(clearTimeout); lp.forEach(clearInterval);
    tm=[]; lp=[];
    if(ac&&ac.state!=="closed") void ac.close().catch(()=>{});
  }
  return {
    play(action,by){if(active&&ACT[action])start(action,by===1?1:0)},
    setSound,
    destroy
  };
}

function getBearPartnerId() {
  const partner = friends.find(friend => friend?.id && String(friend.id) !== String(me?.id));
  return partner ? String(partner.id) : '';
}
function startBearRealtime() {
  if (!sb || !me?.id) return;
  const ownTopic = 'cute-bunny-bear-actions-' + String(me.id);
  if (!bearRealtimeChannel || bearRealtimeTopic !== ownTopic) {
    if (bearRealtimeChannel) void sb.removeChannel(bearRealtimeChannel);
    bearRealtimeTopic = ownTopic;
    bearRealtimeChannel = sb.channel(ownTopic, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'bear-action' }, ({ payload }) => {
        if (String(payload?.userId || '') === String(me?.id || '')) return;
        const action = String(payload?.action || '');
        if (!['hug', 'kiss', 'hands', 'dance', 'pet', 'feed', 'sleep', 'idle'].includes(action)) return;
        triggerBearAction(action, { remote: true, gender: payload?.gender });
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('Bear Hugs receive channel status:', status);
        }
      });
  }
  const partnerId = getBearPartnerId();
  const partnerTopic = partnerId ? 'cute-bunny-bear-actions-' + partnerId : '';
  if (partnerTopic && bearRealtimePartnerTopic !== partnerTopic) {
    if (bearRealtimePartnerChannel) void sb.removeChannel(bearRealtimePartnerChannel);
    bearRealtimePartnerTopic = partnerTopic;
    bearRealtimePartnerChannel = sb.channel(partnerTopic, { config: { broadcast: { self: false } } })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('Bear Hugs send channel status:', status);
        }
      });
  } else if (!partnerTopic && bearRealtimePartnerChannel) {
    void sb.removeChannel(bearRealtimePartnerChannel);
    bearRealtimePartnerChannel = null;
    bearRealtimePartnerTopic = '';
  }
}
function publishBearAction(action) {
  startBearRealtime();
  if (!bearRealtimePartnerChannel || !bearRealtimePartnerTopic || !me?.id) return;
  void bearRealtimePartnerChannel.send({
    type: 'broadcast',
    event: 'bear-action',
    payload: { action, userId: String(me.id), gender: me.gender || null, sentAt: Date.now() }
  }).then(status => {
    if (status !== 'ok') console.warn('Bear Hugs action was not delivered:', status);
  }).catch(error => console.warn('Bear Hugs action could not be sent:', error?.message || error));
}
function syncBearViewerRole() {
  const scene = $('#coupleBearGame .couple-bears-scene');
  if (scene) scene.dataset.viewerGender = me?.gender || '';
}
function triggerBearAction(action, options = {}) {
  const scene = $('#coupleBearGame .couple-bears-scene');
  if (!scene) return;
  const messages = {
    hug: 'A big, warm bear hug! ♡',
    kiss: 'A tiny kiss, sealed with a heart. 💗',
    hands: 'Together, paw in paw. ♡',
    dance: 'Look at them dance! Two happy little bears. ✨',
    pet: 'A gentle head pat. They love it! 🐾',
    feed: 'Strawberries for two. Yum, yum! 🍓',
    sleep: 'Shhh… the little bears are dreaming together. 🌙',
    idle: 'Our little bears are relaxing together. 🌸',
    peekaboo: 'Peekaboo! A little surprise for each other. ♡',
    bump: 'A tiny, gentle bear head bump. ♡'
  };
  scene.dataset.action = action;
  bearPoseEngine?.play(action, bearActorIndex(options.gender || me?.gender));
  const status = $('#coupleBearStatus');
  if (status) status.textContent = messages[action] || 'Two little bears, one big love.';
  document.querySelectorAll('#coupleBearGame [data-couple-action]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.coupleAction === action));
  });
  // Shared Bear Hugs points are awarded by the progression module
  // only after an action is successfully delivered to the accepted partner.
  updateBearLoveMeter();
  if (!options.remote) publishBearAction(action);
}
document.addEventListener('click', event => {
  const soundToggle = event.target.closest('#bearSoundToggle');
  if (soundToggle) {
    const next = localStorage.getItem(bearSoundStorageKey) === 'off' ? 'on' : 'off';
    try { localStorage.setItem(bearSoundStorageKey, next); } catch {}
    updateBearLoveMeter();
    bearPoseEngine?.setSound(next === 'on');
    return;
  }
  const actionButton = event.target.closest('#coupleBearGame [data-couple-action]');
  if (!actionButton) return;
  triggerBearAction(actionButton.dataset.coupleAction);
});
document.addEventListener('click', event => {
  const bear = event.target.closest('#coupleBearGame .couple-bear, #coupleBearGame #bearPoseSvg');
  if (!bear) return;
  triggerBearAction('pet');
});
document.addEventListener('click', event => {
  if (!event.target.closest('#coupleBearGame')) return;
  updateBearLoveMeter();
}, true);

// Open friend profiles from the card surface (but never from its Follow button).
document.addEventListener('click', event => {
  const row = event.target.closest('.friend-row[data-profile]');
  if (!row || event.target.closest('[data-follow]')) return;
  const username = String(row.dataset.profile || '').toLowerCase();
  const rowId = String(row.dataset.friendId || '');
  const isOwnProfile = row.dataset.ownProfile === 'true' || (!!me?.id && rowId === String(me.id));
  const friend = isOwnProfile ? me : [...friends, ...friendResults].find(user =>
    (rowId && String(user.id) === rowId) ||
    String(user.username || '').toLowerCase() === username
  );
  if (!friend || (!isOwnProfile && String(friend.id) === String(me?.id || ''))) return;
  event.preventDefault();
  event.stopPropagation();
  showFriendProfile(friend);
}, true);

// Touch free space to dismiss any modal / gate
document.addEventListener('click', e => {
  // If clicking on photo lightbox: touching ANYWHERE except Save/Delete closes it
  const lightbox = e.target.closest('#photoLightbox');
  if (lightbox && !lightbox.classList.contains('hidden')) {
    if (!e.target.closest('.photo-lightbox-actions')) {
      closePhotoLightbox();
      return;
    }
  }

  // If clicking on any auth-gate backdrop
  if (e.target.classList.contains('auth-gate')) {
    e.target.classList.add('hidden');
    if (e.target.id === 'notificationGate') void dismissViewedNotifications();
    if (e.target.id === 'photoLightbox') closePhotoLightbox();
    if (e.target.id === 'memoryActionGate') closeMemoryActions();
    if (e.target.id === 'appExitGate') {
      appExitStep = 0;
      $('#appExitPrompt').hidden = false;
      $('#appExitCatStep').hidden = true;
    }
    return;
  }

  // Dismiss message actions popup if clicking outside
  if (!e.target.closest('.chat-actions-popup') && !e.target.closest('.chat-bubble')) {
    hideMessageActions();
  }

  // Dismiss now playing panel if clicking outside island
  const island = $('#nowPlayingIsland');
  if (island && !island.classList.contains('hidden') && !$('#nowPlayingPanel')?.classList.contains('hidden')) {
    if (!e.target.closest('#nowPlayingIsland, #nowPlayingPanel')) toggleMusicIsland(false);
  }
});

// Photo long-press mirrors a normal photo tap: open the same full-screen lightbox.
document.addEventListener('pointerdown', e => {
  const photo = e.target.closest('.feed-photo');
  if (!photo || (e.pointerType === 'mouse' && e.button !== 0)) return;
  clearTimeout(photoPressState.timer);
  clearTimeout(photoPressState.suppressTimer);
  photoPressState.suppressClick = false;
  photoPressState.image = photo;
  photoPressState.pointerId = e.pointerId;
  photoPressState.startX = e.clientX;
  photoPressState.startY = e.clientY;
  photoPressState.timer = setTimeout(() => {
    if (!photoPressState.image?.isConnected || photoPressState.pointerId !== e.pointerId) return;
    photoPressState.suppressClick = true;
    const id = photoPressState.image.closest('.feed-item')?.dataset.memory;
    if (id) void openPhotoLightbox(id);
    clearTimeout(photoPressState.suppressTimer);
    photoPressState.suppressTimer = setTimeout(() => {
      photoPressState.suppressClick = false;
    }, 900);
  }, 550);
});

function cancelPhotoPress(e) {
  if (photoPressState.pointerId !== e.pointerId) return;
  clearTimeout(photoPressState.timer);
  photoPressState.timer = null;
  photoPressState.image = null;
  photoPressState.pointerId = null;
}

document.addEventListener('pointermove', e => {
  if (photoPressState.pointerId !== e.pointerId || !photoPressState.image) return;
  if (Math.hypot(e.clientX - photoPressState.startX, e.clientY - photoPressState.startY) > 12) {
    cancelPhotoPress(e);
  }
});
document.addEventListener('pointerup', cancelPhotoPress);
document.addEventListener('pointercancel', cancelPhotoPress);
// Suppress the browser's native image callout/download menu on long press.
document.addEventListener('contextmenu', e => {
  if (e.target.closest('.feed-photo, .photo-frame')) {
    e.preventDefault();
    e.stopPropagation();
  }
}, true);
document.addEventListener('dragstart', e => {
  if (e.target.closest('.feed-photo, .photo-frame')) {
    e.preventDefault();
    e.stopPropagation();
  }
}, true);
document.addEventListener('selectstart', e => {
  if (e.target.closest('.feed-photo, .photo-frame')) e.preventDefault();
}, true);

// Notes message gestures: tap text for its reaction, hold text for message options,
// and hold a shared photo for the shorter Reply/Delete photo menu.
document.addEventListener('pointerdown', e => {
  const photoTarget = e.target.closest('.chat-page .chat-message-photo, .home-note-memory .chat-message-photo');
  const bubble = e.target.closest('.chat-page .chat-bubble, .home-note-memory .chat-bubble');
  const pressTarget = photoTarget || bubble;
  if (!pressTarget || e.target.closest('.chat-actions-popup') || (!photoTarget && e.target.closest('button')) || (e.pointerType === 'mouse' && e.button !== 0)) return;

  clearTimeout(messagePressState.timer);
  clearTimeout(messagePressState.suppressTimer);
  messagePressState.suppressClick = false;
  messagePressState.longPressed = false;
  messagePressState.bubble = pressTarget;
  messagePressState.pointerId = e.pointerId;
  messagePressState.startX = e.clientX;
  messagePressState.startY = e.clientY;
  pressTarget.classList.add('is-pressed');

  messagePressState.timer = setTimeout(() => {
    if (!messagePressState.bubble?.isConnected || messagePressState.pointerId !== e.pointerId) return;
    const id = messagePressState.bubble.dataset.chatMessageId || messagePressState.bubble.closest('.chat-message')?.dataset.memory;
    if (!id) return;
    messagePressState.longPressed = true;
    messagePressState.suppressClick = true;
    showMessageActions(id, messagePressState.bubble, !!photoTarget);
  }, 205);
});

function cancelNotesMessagePress(e) {
  if (messagePressState.pointerId !== e.pointerId) return;
  clearTimeout(messagePressState.timer);
  messagePressState.timer = null;
  messagePressState.bubble?.classList.remove('is-pressed');
  messagePressState.bubble = null;
  messagePressState.pointerId = null;
  messagePressState.longPressed = false;
  messagePressState.suppressClick = true;
  clearTimeout(messagePressState.suppressTimer);
  messagePressState.suppressTimer = setTimeout(() => {
    messagePressState.suppressClick = false;
  }, 350);
}

document.addEventListener('pointermove', e => {
  if (messagePressState.pointerId !== e.pointerId || !messagePressState.bubble) return;
  const dx = e.clientX - messagePressState.startX;
  const dy = e.clientY - messagePressState.startY;
  if (Math.hypot(dx, dy) > 12) cancelNotesMessagePress(e);
});

function finishNotesMessagePress(e) {
  if (messagePressState.pointerId !== e.pointerId) return;
  clearTimeout(messagePressState.timer);
  messagePressState.timer = null;
  messagePressState.bubble?.classList.remove('is-pressed');
  messagePressState.bubble = null;
  messagePressState.pointerId = null;
  if (messagePressState.longPressed) {
    messagePressState.suppressClick = true;
    clearTimeout(messagePressState.suppressTimer);
    messagePressState.suppressTimer = setTimeout(() => {
      messagePressState.suppressClick = false;
      messagePressState.longPressed = false;
    }, 700);
  }
}

document.addEventListener('pointerup', finishNotesMessagePress);
document.addEventListener('pointercancel', cancelNotesMessagePress);
// A completed photo hold opens its action menu, never the ordinary photo viewer.
document.addEventListener('click', event => {
  const photo = event.target.closest('.chat-message-photo');
  if (!photo || !messagePressState.longPressed || !messagePressState.suppressClick) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  messagePressState.suppressClick = false;
  clearTimeout(messagePressState.suppressTimer);
  messagePressState.suppressTimer = null;
}, true);
document.addEventListener('keydown', event => {
  const editor = event.target.closest?.('.chat-bubble.is-editing .chat-message-text[contenteditable="true"]');
  if (!editor) return;
  const id = editor.closest('.chat-bubble')?.dataset.chatMessageId;
  if (event.key === 'Escape') {
    event.preventDefault();
    document.querySelector(`[data-chat-edit-cancel="${CSS.escape(String(id))}"]`)?.click();
  } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    document.querySelector(`[data-chat-edit-save="${CSS.escape(String(id))}"]`)?.click();
  }
});

// Streak entry uses capture phase so card clicks cannot be swallowed by another page handler.
document.addEventListener('click', event => {
  let target = event.target;
  if (target && target.nodeType !== 1) target = target.parentElement;
  const retryButton = target?.closest('[data-streak-retry]');
  const streakButton = target?.closest('[data-open-streak]');
  if (!retryButton && !streakButton) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (streakButton) playCuteSound('boing');
  openStreakGarden();
}, true);

document.addEventListener('keydown', event => {
  const thumbnail = event.target?.closest?.('.streak-art-trigger[data-open-streak]');
  if (!thumbnail || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  playCuteSound('boing');
  openStreakGarden();
}, true);

// Homepage feature cards behave like buttons for keyboard and touch users.
document.addEventListener('keydown', event => {
  const card = event.target?.closest?.('.home-feature-card[role="button"]');
  if (!card || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  card.click();
}, true);

// Keep the tappable kindness card accessible to keyboard users.
document.addEventListener('keydown', event => {
  const card = event.target?.closest?.('#dailyCard');
  if (!card || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  rollKindness();
}, true);

// Main delegation
// Switch sections on pointer release immediately; the delegated click handler
// below skips its legacy refresh path for a tab already switched here.
document.addEventListener('pointerdown', e => {
  const nav = e.target.closest('#nav button[data-page]');
  if (!nav || nav.dataset.page === page || (e.pointerType === 'mouse' && e.button !== 0)) return;
  nav.dataset.fastNavHandled = 'true';
  go(nav.dataset.page);
}, { capture: true, passive: false });

// Touch double-taps are recognized on pointer release, so the heart reacts
// on the second tap instead of waiting for the browser's synthetic dblclick.
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
  const tile = e.target.closest('.feed-item .tile');
  if (!tile || e.target.closest('button:not(.play-song):not(.album-art), a, input, textarea, select')) return;
  const item = tile.closest('.feed-item');
  const id = String(item?.dataset.memory || '');
  if (!id) return;
  // Cancel the pending single-photo open as soon as the second tap begins.
  if (lastTouchMemoryTap.id === id && performance.now() - lastTouchMemoryTap.time <= 320) {
    clearTimeout(photoPressState.clickTimer);
    photoPressState.clickTimer = null;
    photoPressState.pendingPhotoId = null;
  }
  tile.dataset.touchLikeStart = id;
}, { passive: true });

document.addEventListener('pointerup', e => {
  if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
  const tile = e.target.closest('.feed-item .tile');
  if (!tile || tile.dataset.touchLikeStart !== String(tile.closest('.feed-item')?.dataset.memory || '')) return;
  const item = tile.closest('.feed-item');
  const kind = item?.dataset.kind || item?.dataset.memoryKind || '';
  const isPhotoOrMusic = /photo|music|song|audio/i.test(kind) || Boolean(tile.querySelector('.feed-photo, audio, .audio-player, [data-audio], .music-art, .album-art'));
  if (!isPhotoOrMusic) return;
  const id = String(item?.dataset.memory || '');
  const now = performance.now();
  if (id && lastTouchMemoryTap.id === id && now - lastTouchMemoryTap.time <= 320) {
    lastTouchMemoryTap = { id: '', time: 0, tile: null };
    suppressNativeMemoryDblclickUntil = now + 500;
    if (e.target.closest('.feed-photo')) {
      clearTimeout(photoPressState.clickTimer);
      photoPressState.clickTimer = null;
      photoPressState.pendingPhotoId = null;
      // The synthetic click after the second touch must not reopen the image.
      suppressPhotoClickUntil = now + 650;
    }
    void popLoveHeart(tile, e);
  } else {
    lastTouchMemoryTap = { id, time: now, tile };
  }
  tile.dataset.touchLikeStart = '';
}, { passive: true });

// Double-click a photo or music memory card to like/unlike it.
document.addEventListener('dblclick', e => {
  if (performance.now() < suppressNativeMemoryDblclickUntil) { e.preventDefault(); return; }
  const tile = e.target.closest('.feed-item .tile');
  if (!tile) return;
  // A photo's first tap is delayed briefly so a second tap can be recognized
  // as a double-click instead of opening the lightbox before dblclick fires.
  const photo = e.target.closest('.feed-photo');
  if (photo) {
    clearTimeout(photoPressState.clickTimer);
    photoPressState.clickTimer = null;
    photoPressState.pendingPhotoId = null;
  }
  // The album artwork is itself a play button; allow double-clicking it to
  // like the song while keeping other action buttons excluded.
  const action = e.target.closest('button, a, input, textarea, select');
  if (action && !action.matches('.play-song, .album-art')) return;
  if (action?.matches('.memory-heart-toggle, [data-memory-delete], [data-memory-download]')) return;
  const item = tile.closest('.feed-item');
  const kind = item?.dataset.kind || item?.dataset.memoryKind || '';
  const isPhotoOrMusic = /photo|music|song|audio/i.test(kind) ||
    Boolean(tile.querySelector('.feed-photo, audio, .audio-player, [data-audio], .music-art, .album-art'));
  if (!isPhotoOrMusic) return;
  e.preventDefault();
  void popLoveHeart(tile, e);
});

// Profile editor choices inside the restored Profile settings section.
document.addEventListener('click', event => {
  let target = event.target;
  if (target && target.nodeType !== 1) target = target.parentElement;
  const theme = target?.closest?.('[data-settings-theme-choice]');
  const buddy = target?.closest?.('[data-settings-buddy-choice]');
  if (theme) {
    document.querySelectorAll('[data-settings-theme-choice]').forEach(button => { const active = button === theme; button.classList.toggle('is-selected', active); button.setAttribute('aria-checked', String(active)); });
    const value = theme.dataset.settingsThemeChoice;
    const field = document.querySelector('#settingsThemeValue');
    if (field) field.value = value;
    setTheme(value);
  }
  if (buddy) {
    document.querySelectorAll('[data-settings-buddy-choice]').forEach(button => { const active = button === buddy; button.classList.toggle('is-selected', active); button.setAttribute('aria-checked', String(active)); });
    const field = document.querySelector('#settingsBuddyValue');
    if (field) field.value = buddy.dataset.settingsBuddyChoice;
  }
}, true);

// Settings category tabs: capture clicks before other delegated handlers.
document.addEventListener('click', event => {
  let target = event.target;
  if (target && target.nodeType !== 1) target = target.parentElement;
  const tab = target?.closest?.('#profileSettingsPanel [data-settings-tab]');
  if (!tab) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const panel = document.querySelector('#profileSettingsPanel');
  if (!panel) return;
  const selected = tab.dataset.settingsTab;
  panel.querySelectorAll('[data-settings-tab]').forEach(button => {
    const active = button === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.setAttribute('aria-pressed', String(active));
  });
  panel.querySelectorAll('[data-settings-section]').forEach(section => {
    section.classList.toggle('hidden', section.dataset.settingsSection !== selected);
  });
}, true);

// Long-press the flower on your own open profile to enter the classic profile editor.
// A normal tap remains the existing wallpaper action.
document.addEventListener('pointerdown', event => {
  const button = event.target?.closest?.('#friendProfileFollow[data-theme-action="true"]');
  if (!button || button.disabled) return;
  clearTimeout(classicProfilePressState.timer);
  classicProfilePressState.button = button;
  classicProfilePressState.pointerId = event.pointerId;
  classicProfilePressState.startX = event.clientX;
  classicProfilePressState.startY = event.clientY;
  classicProfilePressState.longPressed = false;
  classicProfilePressState.timer = setTimeout(() => {
    if (classicProfilePressState.button !== button) return;
    classicProfilePressState.longPressed = true;
    classicProfilePressState.suppressClick = true;
    clearTimeout(classicProfilePressState.suppressTimer);
    classicProfilePressState.suppressTimer = setTimeout(() => { classicProfilePressState.suppressClick = false; }, 900);
    openClassicProfileEditor();
  }, 560);
}, true);
document.addEventListener('pointermove', event => {
  if (!classicProfilePressState.button || event.pointerId !== classicProfilePressState.pointerId) return;
  if (Math.hypot(event.clientX - classicProfilePressState.startX, event.clientY - classicProfilePressState.startY) > 12) {
    clearTimeout(classicProfilePressState.timer);
    classicProfilePressState.timer = null;
  }
}, true);
const finishClassicProfilePress = event => {
  if (!classicProfilePressState.button) return;
  if (event && event.pointerId !== classicProfilePressState.pointerId) return;
  clearTimeout(classicProfilePressState.timer);
  classicProfilePressState.timer = null;
  classicProfilePressState.button = null;
  classicProfilePressState.pointerId = null;
};
document.addEventListener('pointerup', finishClassicProfilePress, true);
document.addEventListener('pointercancel', finishClassicProfilePress, true);
document.addEventListener('click', event => {
  if (!classicProfilePressState.suppressClick) return;
  const button = event.target?.closest?.('#friendProfileFollow');
  if (!button) return;
  classicProfilePressState.suppressClick = false;
  clearTimeout(classicProfilePressState.suppressTimer);
  classicProfilePressState.suppressTimer = null;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

// Profile settings: the flower is a true toggle; taps outside close it,
// while taps inside the panel never dismiss it.
document.addEventListener('click', event => {
  let target = event.target;
  if (target && target.nodeType !== 1) target = target.parentElement;
  const trigger = target?.closest?.('#profileSettingsTrigger');
  const panel = document.querySelector('#profileSettingsPanel');
  if (!trigger && panel && !panel.classList.contains('hidden') &&
      !target?.closest?.('#profileSettingsPanel')) {
    restoreProfileSettingsToMain();
    return;
  }
  if (!trigger) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const mount = document.querySelector('#profileSettingsMount');
  if (!mount) return;
  if (!document.querySelector('#profileSettingsPanel')) mount.innerHTML = profileSettingsMarkup();
  const currentPanel = document.querySelector('#profileSettingsPanel');
  const willOpen = !!currentPanel?.classList.contains('hidden');
  if (!willOpen) {
    currentPanel.classList.add('hidden');
    trigger.setAttribute('aria-expanded', 'false');
    return;
  }
  renderProfileSettings();
  currentPanel?.classList.remove('hidden');
  trigger.setAttribute('aria-expanded', 'true');
}, true);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#profileGate')?.classList.contains('hidden')) {
    closeClassicProfileEditor();
    return;
  }
  if (event.key !== 'Escape') return;
  const panel = document.querySelector('#profileSettingsPanel');
  if (!panel || panel.classList.contains('hidden')) return;
  restoreProfileSettingsToMain();
});


// Submit the friend search form on Enter as well as its Search button.
document.addEventListener('submit', e => {
  if (!e.target.matches('#friendSearchForm')) return;
  e.preventDefault();
  void searchFriends();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const questCard = e.target.closest?.('.sg-daily-quest-card[data-daily-quest-action]');
  if (!questCard) return;
  e.preventDefault();
  questCard.click();
});

document.addEventListener('click', async e => {
  // Kindness card
  if (e.target.closest('#dailyCard')) {
    rollKindness();
    return;
  }

  // Notes likes are applied on the first tap; do not wait for a possible double-tap.
  const bubble = e.target.closest('.chat-page .chat-bubble, .home-note-memory .chat-bubble');
  const selectedText = window.getSelection?.()?.toString().trim();
  if (bubble && !e.target.closest('button')) {
    if (bubble.classList.contains('is-editing')) return;
    if (messagePressState.suppressClick) {
      messagePressState.suppressClick = false;
      clearTimeout(messagePressState.suppressTimer);
      messagePressState.suppressTimer = null;
      messagePressState.longPressed = false;
      clearTimeout(bubbleTapState.timer);
      bubbleTapState.timer = null;
      bubbleTapState.bubble = null;
      return;
    }
    if (selectedText || bubble.classList.contains('no-heart-reaction')) return;
    playCuteSound('boing');
    clearTimeout(bubbleTapState.timer);
    bubbleTapState.timer = null;
    bubbleTapState.bubble = null;
    if (!messagePressState.longPressed && !messagePressState.suppressClick) {
      void popLoveHeart(bubble, e);
    }
    return;
  }

  // Chat action: Edit — darken immediately, then edit the text in place.
  const editBtn = e.target.closest('[data-chat-edit]');
  if (editBtn) {
    const id = String(editBtn.dataset.chatEdit);
    const item = feed.find(m => String(m.id) === id);
    const bubbleEl = document.querySelector(`.chat-bubble[data-chat-message-id="${CSS.escape(id)}"]`);
    const textEl = bubbleEl?.querySelector('.chat-message-text');
    if (!item || !bubbleEl || !textEl || String(item.author?.id || item.owner_id || '') !== String(me?.id || '')) {
      hideMessageActions();
      return;
    }
    bubbleEl.classList.add('is-editing');
    bubbleEl.setAttribute('aria-label', 'Editing your message');
    textEl.setAttribute('contenteditable', 'true');
    textEl.setAttribute('role', 'textbox');
    textEl.setAttribute('aria-label', 'Edit message');
    textEl.focus();
    const range = document.createRange();
    range.selectNodeContents(textEl);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const popup = document.querySelector('.chat-actions-popup');
    if (popup) {
      popup.innerHTML = `
        <button type="button" class="chat-action-btn edit-save-btn" data-chat-edit-save="${esc(id)}">Save</button>
        <button type="button" class="chat-action-btn" data-chat-edit-cancel="${esc(id)}">Cancel</button>
      `;
      popup.setAttribute('aria-label', 'Save or cancel message edit');
    }
    return;
  }

  const cancelEditBtn = e.target.closest('[data-chat-edit-cancel]');
  if (cancelEditBtn) {
    const id = String(cancelEditBtn.dataset.chatEditCancel);
    const bubbleEl = document.querySelector(`.chat-bubble[data-chat-message-id="${CSS.escape(id)}"]`);
    const textEl = bubbleEl?.querySelector('.chat-message-text');
    const item = feed.find(m => String(m.id) === id);
    if (textEl && item) textEl.textContent = item.text || '';
    textEl?.removeAttribute('contenteditable');
    textEl?.removeAttribute('role');
    textEl?.removeAttribute('aria-label');
    bubbleEl?.classList.remove('is-editing');
    bubbleEl?.setAttribute('aria-label', 'Message');
    hideMessageActions();
    return;
  }

  const saveEditBtn = e.target.closest('[data-chat-edit-save]');
  if (saveEditBtn) {
    const id = String(saveEditBtn.dataset.chatEditSave);
    const item = feed.find(m => String(m.id) === id);
    const bubbleEl = document.querySelector(`.chat-bubble[data-chat-message-id="${CSS.escape(id)}"]`);
    const textEl = bubbleEl?.querySelector('.chat-message-text');
    const nextText = String(textEl?.innerText || textEl?.textContent || '').trim();
    if (!item || !nextText) { toast('A message cannot be empty ♡'); return; }
    saveEditBtn.disabled = true;
    saveEditBtn.textContent = 'Saving…';
    try {
      const { data, error } = await sb.from('memories').update({ text: nextText })
        .eq('id', Number(id)).eq('owner_id', me.id).eq('kind', 'note')
        .select('id,text,edited_at').single();
      if (error) throw error;
      item.text = data.text;
      item.edited_at = data.edited_at || new Date().toISOString();
      hideMessageActions();
      if (page === 'notes') renderNotesPage();
      else render();
      toast('Message updated ♡');
    } catch (error) {
      saveEditBtn.disabled = false;
      saveEditBtn.textContent = 'Save';
      toast(error.message || 'Could not update this message.');
    }
    return;
  }

  const replyBtn = e.target.closest('[data-chat-reply]');
  if (replyBtn) {
    replyingToMessageId = String(replyBtn.dataset.chatReply);
    hideMessageActions();
    if (page !== 'notes') go('notes'); else renderNotesPage();
    const input = $('#chatInput');
    input?.focus({ preventScroll: true });
    syncNotesKeyboardLayout();
    return;
  }
  if (e.target.closest('[data-chat-reply-cancel]')) { replyingToMessageId = null; renderNotesPage(); return; }
  const jumpReply = e.target.closest('[data-chat-jump]');
  if (jumpReply) {
    const target = document.querySelector(`.chat-message[data-memory="${CSS.escape(jumpReply.dataset.chatJump)}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.classList.add('chat-message-highlight');
    setTimeout(() => target?.classList.remove('chat-message-highlight'), 1000);
    return;
  }
  // Chat action: Copy
  const copyBtn = e.target.closest('[data-chat-copy]');
  if (copyBtn) {
    const id = copyBtn.dataset.chatCopy;
    hideMessageActions();
    await copyMemoryText(id);
    return;
  }

  // Chat action: hide someone else's note only in this account's view.
  const hideBtn = e.target.closest('[data-chat-hide]');
  if (hideBtn) {
    const id = hideBtn.dataset.chatHide;
    hideMessageActions();
    hideNoteForMe(id);
    return;
  }

  // Chat action: Delete
  const delBtn = e.target.closest('[data-chat-delete]');
  if (delBtn) {
    const id = delBtn.dataset.chatDelete;
    hideMessageActions();
    void deleteSafely(id);
    return;
  }

  // Instagram Notes: open my composer
  if (e.target.closest('#openMyNoteComposer')) {
    openNoteComposer();
    return;
  }

  // Instagram Notes: tap friend note
  const friendNoteItem = e.target.closest('[data-friend-profile]');
  if (friendNoteItem) {
    const friendId = String(friendNoteItem.dataset.friendId || '');
    const username = String(friendNoteItem.dataset.friendProfile || '').toLowerCase();
    const f = [...friends, ...friendResults].find(u =>
      (friendId && String(u.id) === friendId) ||
      String(u.username || '').toLowerCase() === username
    );
    if (f && String(f.id) !== String(me?.id || '')) showFriendProfile(f);
    return;
  }

  // Note composer submit & clear
  if (e.target.closest('#igNoteSubmit')) {
    void saveIgNote();
    return;
  }
  if (e.target.closest('#igNoteClear')) {
    void clearIgNote();
    return;
  }

  // A section's active dock button returns it to the top. A second tap at
  // the top refreshes the current section without adding another history entry.
  const nav = e.target.closest('#nav button[data-page]');
  if (nav) {
    e.preventDefault();
    if (nav.dataset.fastNavHandled === 'true') {
      delete nav.dataset.fastNavHandled;
      return;
    }
    if (nav.dataset.page !== page) {
      go(nav.dataset.page);
      return;
    }

    const scrollRoot = document.scrollingElement || document.documentElement;
    const currentScrollTop = Math.max(window.scrollY || 0, scrollRoot.scrollTop || 0);
    if (currentScrollTop > 8) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (navRefreshInFlight) return;
    navRefreshInFlight = true;
    try {
      await refresh();
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (error) {
      toast(error?.message || 'This section could not be refreshed. Please try again.');
    } finally {
      navRefreshInFlight = false;
    }
    return;
  }
  const happyThingArt = e.target.closest('[data-happy-go]');
  if (happyThingArt) {
    go(happyThingArt.dataset.happyGo);
    return;
  }
  const goBtn = e.target.closest('[data-go]');
  if (goBtn) {
    go(goBtn.dataset.go);
    return;
  }

  const gardenFlowerButton = e.target.closest('[data-sg-garden-flower]');
  if (gardenFlowerButton && !gardenFlowerButton.disabled) {
    const todayKey = new Date().toISOString().slice(0, 10);
    const blooms = saveStreakGardenBloom(todayKey, gardenFlowerButton.dataset.sgGardenFlower);
    gardenFlowerButton.classList.add('is-watered');
    gardenFlowerButton.disabled = true;
    gardenFlowerButton.setAttribute('aria-pressed', 'true');
    gardenFlowerButton.setAttribute('aria-label', 'Watered flower');
    const gardenArt = $('#sgGardenArt');
    if (gardenArt) {
      gardenArt.classList.remove('sg-water-pop');
      void gardenArt.offsetWidth;
      gardenArt.classList.add('sg-water-pop');
      window.setTimeout(() => gardenArt.classList.remove('sg-water-pop'), 620);
    }
    return;
  }

  const dailyQuestAction = e.target.closest('[data-daily-quest-action]');
  if (dailyQuestAction) {
    const destination = dailyQuestAction.dataset.dailyQuestAction;
    if (destination === 'gallery' || destination === 'music' || destination === 'notes') {
      go(destination);
      if (destination === 'notes') {
        requestAnimationFrame(() => {
          const composer = $('#chatInput');
          composer?.focus();
          if (composer) composer.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      }
    } else if (destination === 'streak') {
      openStreakGarden();
    } else if (destination === 'bear-hugs') {
      go('home');
      requestAnimationFrame(() => {
        const bearGame = $('#coupleBearGame');
        bearGame?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    }
    return;
  }

  const questChoice = e.target.closest('[data-streak-quest-select]');
  if (questChoice) {
    const nextQuest = Number(questChoice.dataset.streakQuestSelect);
    if (Number.isInteger(nextQuest) && nextQuest >= 0 && nextQuest <= 2) {
      streakSelectedDailyQuest = nextQuest;
      renderStreakPage();
    }
    return;
  }

  const gardenTabButton = e.target.closest('[data-streak-garden-tab]');
  if (gardenTabButton) {
    const tabName = gardenTabButton.dataset.streakGardenTab;
    if (!['flowers', 'hearts', 'daily'].includes(tabName)) return;
    streakGardenActiveTab = tabName;
    const gardenTabs = gardenTabButton.closest('.streak-garden-page');
    gardenTabs?.querySelectorAll('[data-streak-garden-tab]').forEach(button => {
      const active = button.dataset.streakGardenTab === tabName;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    gardenTabs?.querySelectorAll('.sg-tab-panel').forEach(panel => {
      const active = panel.id === ({flowers:'sgFlowersPanel',hearts:'sgHeartsPanel',daily:'sgDailyPanel'})[tabName];
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
      if (active) {
        panel.classList.remove('is-active');
        void panel.offsetWidth;
        panel.classList.add('is-active');
      }
    });
    return;
  }

  if (e.target.closest('[data-claim-kindness-event]')) {
    void claimKindnessEventReward();
    return;
  }
  if (e.target.closest('[data-claim-petal-chest]')) {
    claimDailyPetalChest();
    return;
  }
  const collectibleButton = e.target.closest('[data-buy-collectible]');
  if (collectibleButton) { buyGardenCollectible(collectibleButton.dataset.buyCollectible); return; }
  const weeklyClaimButton = e.target.closest('[data-claim-weekly]');
  if (weeklyClaimButton) {
    const days = Number(weeklyClaimButton.dataset.claimWeekly);
    if ([3,5,7].includes(days)) claimWeeklyBloomReward(days, streakDateInTimeZone(normalizeStreakTimeZone(me?.streak_timezone || getBrowserStreakTimeZone())));
    return;
  }

  const streakWeekDate = e.target.closest('[data-streak-week-date]');
  if (streakWeekDate) {
    const dateKey = streakWeekDate.dataset.streakWeekDate;
    streakSelectedWeekDate = dateKey;
    document.querySelectorAll('.streak-garden-page [data-streak-week-date]').forEach(day => {
      const selected = day.dataset.streakWeekDate === dateKey;
      day.classList.toggle('is-selected', selected);
      day.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('.streak-garden-page .sg-week-flower.is-clicked').forEach(flower => flower.classList.remove('is-clicked'));
    const clickedFlower = streakWeekDate.querySelector('.sg-week-flower');
    if (clickedFlower) {
      clickedFlower.classList.remove('is-clicked');
      void clickedFlower.offsetWidth;
      clickedFlower.classList.add('is-clicked');
    }
    return;
  }
  if (e.target.closest('#streakAddGoal')) { const form = $('#streakGoalForm'); form?.classList.toggle('hidden'); if (form && !form.classList.contains('hidden')) $('#streakGoalInput')?.focus(); return; }
  const removeStreakGoal = e.target.closest('[data-streak-remove-goal]');
  if (removeStreakGoal) { writeStreakGoals(readStreakGoals().filter(goal => goal.id !== removeStreakGoal.dataset.streakRemoveGoal)); renderStreakPage(); return; }

  // Mascot button — restore the earlier, soft CSS hop from the previous design.
  if (e.target.closest('#bunnyBuddy')) {

    const bunny = $('#bunnyBuddy'), buddy = me?.mascot || '🐰';
    const greetings = { '🐰': 'Bunny says hi! ♡', '🐱': 'Kitty says meow! ♡', '🐻': 'Bear sends a hug! ♡', '🐸': 'Froggy says ribbit! ♡' };
    bunny.classList.remove('bunny-happy');
    void bunny.offsetWidth;
    bunny.classList.add('bunny-happy');
    toast(greetings[buddy] || 'Your buddy says hi! ♡');
    return;
  }

  // Two-step Home exit: "No" returns to the scrapbook; Exit reveals the cat.
  if (e.target.closest('#appExitStay')) {
    $('#appExitGate').classList.add('hidden');
    appExitStep = 0;
    pushAppBackGuard();
    return;
  }
  if (e.target.closest('#appExitContinue')) {
    appExitStep = 1;
    $('#appExitPrompt').hidden = true;
    $('#appExitCatStep').hidden = false;
    return;
  }
  if (e.target.closest('#appExitCat')) {
    finishAppExit();
    return;
  }

  // Mode & profile & notifications open
  if (e.target.closest('#surprise')) {
    setMode(document.body.dataset.mode === 'dark' ? 'light' : 'dark');
    return;
  }
  if (e.target.closest('#notificationOpen')) {
    notificationVisibleCount = 3;
    $('#notificationGate').classList.remove('hidden');
    void loadNotifications().then(() => {
      if (!$('#notificationGate').classList.contains('hidden')) renderNotifications();
    });
    return;
  }
  if (e.target.closest('#profileOpen, [data-open-profile]')) {
    if (!me) return;
    showFriendProfile(me);
    return;
  }

  // Profile save & sign out
  if (e.target.closest('#profileSave')) {
    try {
      const username = $('#profileUsername').value.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(username)) return toast('Use 3–24 letters, numbers, or underscores ♡');
      const updated = await api('/me', {
        method: 'PUT',
        body: JSON.stringify({
          username,
          displayName: $('#profileDisplay').value.trim(),
          bio: $('#profileBio').value.trim(),
          theme: $('#profileTheme').value,
          mascot: $('#profileMascot').value,
          gender: document.querySelector('[data-classic-gender].is-selected')?.dataset.classicGender || null
        })
      });
      me = { ...me, ...updated };
      $('#topMascot').textContent = me.mascot || '🐰';
      $('#profileGate').classList.add('hidden');
      document.body.classList.remove('classic-profile-open');
      await refresh();
      syncPlayer();
      if ($('#profileGate').dataset.returnToOwnProfile === 'true') {
        $('#profileGate').dataset.returnToOwnProfile = 'false';
        showFriendProfile(me);
      }
      toast('Profile saved ♡');
    } catch (error) {
      toast(error.message);
    }
    return;
  }

  if (e.target.closest('#signOut')) {
    closeRealtime();
    if (sb) await sb.auth.signOut();
    localStorage.removeItem('cuteBunnyToken');
    token = '';
    me = null;
    notificationRows = [];
    $('#profileGate').classList.add('hidden');
    $('#app').classList.add('hidden');
    $('#welcome').classList.remove('hidden');
    return;
  }

  // Welcome enter & auth switch
  if (e.target.closest('#enter')) {
    openAuth('register');
    return;
  }
  if (e.target.closest('#authSwitch')) {
    openAuth(authMode === 'login' ? 'register' : 'login');
    return;
  }

  if (e.target.closest('#profileSettingsClose')) { restoreProfileSettingsToMain(); return; }
  const settingsTab = e.target.closest('[data-settings-tab]');
  if (settingsTab) { const selected = settingsTab.dataset.settingsTab; document.querySelectorAll('[data-settings-tab]').forEach(button => { const active = button === settingsTab; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); }); document.querySelectorAll('[data-settings-section]').forEach(section => { const key = section.dataset.settingsSection; const visible = selected === 'other' ? ['other', 'accessibility', 'account'].includes(key) : key === selected; section.classList.toggle('hidden', !visible); }); return; }
  const liveBuddyChoice = e.target.closest('[data-settings-buddy-choice]');
  if (liveBuddyChoice) { $('#settingsBuddyValue').value = liveBuddyChoice.dataset.settingsBuddyChoice; document.querySelectorAll('[data-settings-buddy-choice]').forEach(button => { const selected=button===liveBuddyChoice; button.classList.toggle('is-selected',selected); button.setAttribute('aria-checked',String(selected)); }); updateProfileLivePreview(); return; }
  const classicGenderChoice = e.target.closest('[data-classic-gender]');
  if (classicGenderChoice) {
    document.querySelectorAll('[data-classic-gender]').forEach(button => {
      const selected = button === classicGenderChoice;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    return;
  }
  if (e.target.closest('#profileEditorClose')) { closeClassicProfileEditor(); return; }
  const genderChoice = e.target.closest('[data-profile-gender]');
  if (genderChoice) { document.querySelectorAll('[data-profile-gender]').forEach(button => button.classList.toggle('is-selected', button === genderChoice)); const preview = $('#profileGenderPreview'); if (preview) preview.textContent = genderChoice.dataset.profileGender === 'male' ? 'Preview: 👑 King' : 'Preview: 👑 Queen'; return; }
  if (e.target.closest('#profileSettingsSave')) { void saveProfileSettings(); return; }
  if (e.target.closest('#profileSettingsWallpaper')) { void cycleProfileWallpaper(); return; }
  if (e.target.closest('#profileSettingsOpenNotifications, [data-open-notification-settings]')) {
    restoreProfileSettingsToMain();
    $('#notificationGate')?.classList.remove('hidden');
    return;
  }

  if (e.target.closest('#friendProfileClose')) {
    restoreProfileSettingsToMain();
    $('#friendProfileGate')?.classList.add('hidden');
    return;
  }
  // Friend search & profile & follow
  // Friend search is handled by the form's submit event so typing/clicking
  // inside the input never triggers a premature empty search.
  const friendLink = e.target.closest('[data-profile]');
  const friendCard = e.target.closest('.friend-row');
  if (friendLink || (friendCard && !e.target.closest('[data-follow]'))) {
    const profileTrigger = friendLink || friendCard.querySelector('[data-profile]');
    const friend = [...friends, ...friendResults].find(u => u.username === profileTrigger?.dataset.profile);
    if (friend) showFriendProfile(friend);
    return;
  }
  const followBtn = e.target.closest('#friendProfileFollow, [data-follow]');
  if (followBtn?.dataset.decorative === 'true') return;
  if (followBtn?.dataset.themeAction === 'true') {
    void cycleProfileWallpaper();
    return;
  }
  if (followBtn) {
    const username = followBtn.dataset.follow || $('#friendProfileGate').dataset.username;
    const isFollowing = followBtn.dataset.following ? followBtn.dataset.following === 'true' : $('#friendProfileGate').dataset.following === 'true';
    if (username) void toggleFriendFollow(username, isFollowing);
    return;
  }

  // Theme choices
  const themeBtn = e.target.closest('[data-theme-choice]');
  if (themeBtn) {
    $('#profileTheme').value = themeBtn.dataset.themeChoice;
    updateThemePreview(themeBtn.dataset.themeChoice);
    return;
  }
  const buddyBtn = e.target.closest('[data-buddy-choice]');
  if (buddyBtn) {
    $('#profileMascot').value = buddyBtn.dataset.buddyChoice;
    updateBuddyChoices(buddyBtn.dataset.buddyChoice);
    updateThemePreview($('#profileTheme').value);
    return;
  }

  // Music controls
  if (e.target.closest('#nowPlayingPill')) {
    toggleMusicIsland();
    return;
  }
  if (e.target.closest('#nowPlayingToggle')) {
    const audio = $('#globalAudio');
    if (audio.paused) void audio.play().catch(error => toast(error.message));
    else audio.pause();
    syncPlayer();
    return;
  }
  if (e.target.closest('#nowPlayingPrevious')) {
    stepSong(-1);
    return;
  }
  if (e.target.closest('#nowPlayingNext')) {
    stepSong(1);
    return;
  }
  const playBtn = e.target.closest('[data-play-song]');
  if (playBtn) {
    void playSong(playBtn.dataset.playSong);
    return;
  }
  const cardDeleteBtn = e.target.closest('[data-memory-delete]');
  if (cardDeleteBtn) {
    const id = cardDeleteBtn.dataset.memoryDelete;
    void deleteSafely(id);
    return;
  }

  const downloadBtn = e.target.closest('[data-memory-download]');
  if (downloadBtn) {
    void downloadMemoryById(downloadBtn.dataset.memoryDownload, downloadBtn);
    return;
  }

  // Photo open & lightbox controls
  const photo = e.target.closest('.feed-photo');
  if (photo) {
    if (photoPressState.suppressClick) {
      photoPressState.suppressClick = false;
      clearTimeout(photoPressState.suppressTimer);
      return;
    }
    const id = photo.closest('.feed-item')?.dataset.memory;
    if (!id) return;
    // A double-tap is reserved for liking; only a single tap opens the photo.
    if (performance.now() < suppressPhotoClickUntil) return;
    clearTimeout(photoPressState.clickTimer);
    photoPressState.pendingPhotoId = String(id);
    photoPressState.clickTimer = setTimeout(() => {
      const pendingId = photoPressState.pendingPhotoId;
      photoPressState.clickTimer = null;
      photoPressState.pendingPhotoId = null;
      if (pendingId) void openPhotoLightbox(pendingId);
    }, 320);
    return;
  }
  if (e.target.closest('#photoLightboxSave')) {
    void downloadMemoryById($('#photoLightbox').dataset.memoryId, e.target.closest('#photoLightboxSave'));
    return;
  }
  if (e.target.closest('#photoLightboxDelete')) {
    const id = $('#photoLightbox').dataset.memoryId;
    const item = feed.find(m => String(m.id) === String(id));
    if (!item || item.kind !== 'photo' || item.isPending || String(item.author?.id || item.owner_id || '') !== String(me?.id || '')) return;
    const confirmGate = $('#photoDeleteConfirmGate');
    confirmGate.dataset.memoryId = String(id);
    confirmGate.classList.remove('hidden');
    return;
  }
  if (e.target.closest('#photoDeleteCancel')) {
    $('#photoDeleteConfirmGate').classList.add('hidden');
    return;
  }
  if (e.target.closest('#photoDeleteConfirm')) {
    const id = $('#photoDeleteConfirmGate').dataset.memoryId;
    $('#photoDeleteConfirmGate').classList.add('hidden');
    closePhotoLightbox();
    if (id) void deleteSafely(id);
    return;
  }

  // Memory Actions (from song options)
  if (e.target.closest('#memoryDownload')) {
    void downloadMemoryById($('#memoryActionGate').dataset.memoryId, $('#memoryDownload'));
    return;
  }
  if (e.target.closest('#memoryCopy')) {
    const id = $('#memoryActionGate').dataset.memoryId;
    closeMemoryActions();
    void copyMemoryText(id);
    return;
  }
  if (e.target.closest('#memoryDelete')) {
    const id = $('#memoryActionGate').dataset.memoryId;
    closeMemoryActions();
    void deleteSafely(id);
    return;
  }

  // Notifications
    const notifItem = e.target.closest('[data-notification]');
  if (notifItem) {
    const notification = notificationRows.find(row => String(row.id) === String(notifItem.dataset.notification));
    try {
      if (notification) await markNotificationRead(notification.id);
      if (notification) notificationViewedIds.add(String(notification.id));
      $('#notificationGate').classList.add('hidden');
      await dismissViewedNotifications();
      if (notification?.memory_id) {
        const pageForKind = ({ photo: 'gallery', song: 'music', note: 'notes' })[notification.kind] || 'home';
        go(pageForKind);
        requestAnimationFrame(() => {
          const target = [...document.querySelectorAll('#content [data-memory]')]
            .find(node => String(node.dataset.memory || '') === String(notification.memory_id));
          target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    } catch (err) {
      toast(err?.message || 'This notification could not be opened.');
    }
    return;
  }
  if (e.target.closest('#enablePhoneNotifications')) {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      toast('Phone notifications are not supported by this browser.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast('Allow notifications in your browser settings to receive phone alerts.');
        return;
      }
      localStorage.setItem('cuteBunnyPhoneNotifications', 'on');
      const button = $('#enablePhoneNotifications');
      if (button) button.textContent = 'Phone notifications enabled ✓';
      toast('Phone notifications enabled ♡');
    } catch (error) {
      toast(error?.message || 'Phone notifications could not be enabled.');
    }
    return;
  }
  if (e.target.closest('#notificationsSave')) {
    try {
      const saved = await api('/me', {
        method: 'PUT',
        body: JSON.stringify({
          notificationPreferences: { memories: $('#notifyMemories').checked }
        })
      });
      if (me && saved?.notification_preferences) me.notification_preferences = saved.notification_preferences;
      toast('Notification settings saved ♡');
    } catch (err) {
      toast(err.message);
    }
    return;
  }
});





document.addEventListener('input', event => {
  if (['profileEditUsername','profileEditDisplayName','profileEditBio'].includes(event.target.id)) updateProfileLivePreview();
  if (event.target.id !== 'chatInput') return;
  const field = event.target;
  if (field.value.trim()) startNotesTyping();
  else stopNotesTyping();
  field.style.height = 'auto';
  const nextHeight = Math.min(Math.max(field.scrollHeight, 50), 116);
  field.style.height = nextHeight + 'px';
  field.style.overflowY = field.scrollHeight > 116 ? 'auto' : 'hidden';
  syncChatComposerState(field);
  syncNotesKeyboardLayout();
});

// Keep the Notes composer attached to the visible viewport as the mobile keyboard changes size.
let notesKeyboardFollowLatest = false;

// Resize the Notes conversation viewport and synchronize its masthead with the keyboard.


let notesKeyboardSyncFrame = 0;


document.addEventListener('focusin', event => {
  if (event.target.id === 'chatInput') {
    notesKeyboardDismissed = false;
    scheduleNotesKeyboardLayout();
  }
});
document.addEventListener('focusout', event => {
  if (event.target.id === 'chatInput') {
    stopNotesTyping();
    notesKeyboardDismissed = true;
    document.body.classList.remove('notes-header-hidden');
    notesHeaderLastScrollTop = $('#chatThread')?.scrollTop ?? null;
    scheduleNotesKeyboardLayout();
  }
});
window.addEventListener('resize', scheduleNotesKeyboardLayout);
window.addEventListener('orientationchange', scheduleNotesKeyboardLayout);
window.visualViewport?.addEventListener('resize', scheduleNotesKeyboardLayout);
window.visualViewport?.addEventListener('scroll', scheduleNotesKeyboardLayout);

// Keep the Seen receipt visible only while the reader is at the latest messages.


// Hide the masthead while reading downward and reveal it when scrolling upward.
document.addEventListener('scroll', event => {
  const thread = event.target;
  if (page !== 'notes' || thread?.id !== 'chatThread') return;

  syncNotesSeenReceiptVisibility(thread);

  const currentTop = Math.max(0, Math.round(thread.scrollTop));
  if (document.body.classList.contains('notes-keyboard-open') && !notesKeyboardDismissed) {
    document.body.classList.add('notes-header-hidden');
    notesHeaderLastScrollTop = currentTop;
    return;
  }

  if (notesHeaderLastScrollTop === null) {
    notesHeaderLastScrollTop = currentTop;
    return;
  }

  const delta = currentTop - notesHeaderLastScrollTop;
  if (Math.abs(delta) >= 5) {
    document.body.classList.toggle('notes-header-hidden', delta < 0);
    notesHeaderLastScrollTop = currentTop;
  }
}, true);

// Global Escape handling stays in the app shell; Notes send events live in src/features/notes/chat-events.js.
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (event.target.id === 'chatInput') {
    event.target.blur();
    return;
  }
  closeAllGates();
});

// Auth form submission
document.addEventListener('submit', async e => {
  if (e.target.id !== 'authForm') return;
  e.preventDefault();
  const err = $('#authError');
  err.textContent = '';
  try {
    const body = { email: $('#authEmail').value.trim(), password: $('#authPass').value };
    if (authMode === 'register') {
      body.username = $('#authUser').value.trim().toLowerCase();
      body.displayName = $('#authDisplay').value.trim();
      if (!/^[a-z0-9_]{3,24}$/.test(body.username)) {
        err.textContent = 'Choose a username with 3–24 letters, numbers, or underscores.';
        return;
      }
      if (!body.displayName || body.displayName.length > 60) {
        err.textContent = 'Please enter a display name (up to 60 characters).';
        return;
      }
    }
    const submit = $('#authSubmit');
    submit.disabled = true;
    $('#authSwitch').disabled = true;
    submit.textContent = 'One little moment…';
    const result = await api('/auth/' + (authMode === 'register' ? 'register' : 'login'), {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (result.needsEmailConfirm) {
      err.textContent = 'Check your email to confirm your account, then sign in here.';
      return;
    }
    token = result.token;
    localStorage.setItem('cuteBunnyToken', token);
    await refresh();
    setUser(me);
    void recordLoginStreak();
  } catch (error) {
    err.textContent = error.message.includes('Failed to fetch') ? 'Check your Supabase URL/key and internet connection, then try again.' : error.message;
  } finally {
    $('#authSubmit').disabled = false;
    $('#authSwitch').disabled = false;
    $('#authSubmit').textContent = authMode === 'login' ? 'Sign in ♡' : 'Create account ♡';
  }
});

// Media upload change listener
document.addEventListener('change', async e => {
  const input = e.target.closest('[data-upload]');
  if (!input || !input.files?.length) return;
  const file = input.files[0], kind = input.dataset.upload;
  input.value = '';
  if (file.size > 8 * 1024 * 1024) {
    toast('Choose a file under 8 MB ♡');
    return;
  }
  const photoTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], songTypes = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm'];
  if (!(kind === 'photo' ? photoTypes.includes(file.type) : songTypes.includes(file.type))) {
    toast(kind === 'photo' ? 'Choose a JPG, PNG, WebP, or GIF image ♡' : 'Choose an MP3, MP4, OGG, WAV, or WebM audio file ♡');
    return;
  }
  const tempId = 'upload-' + crypto.randomUUID();
  const previewUrl = kind === 'photo' ? URL.createObjectURL(file) : '';
  const optimistic = {
    id: tempId,
    kind,
    fileName: file.name,
    text: file.name,
    contentType: file.type,
    createdAt: new Date().toISOString(),
    isPending: true,
    previewUrl,
    author: { id: me.id, username: me.username, displayName: me.displayName, mascot: me.mascot }
  };
  if (previewUrl) pendingMediaUrls.set(tempId, previewUrl);
  feed = [optimistic, ...feed];
  render();

  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  form.append('caption', file.name);
  try {
    const saved = await api('/media', { method: 'POST', body: form });
    const item = {
      ...saved,
      createdAt: saved.created_at || optimistic.createdAt,
      fileName: saved.file_name || file.name,
      contentType: saved.content_type || file.type,
      storagePath: saved.storage_path,
      author: optimistic.author,
      previewUrl
    };
    feed = feed.map(m => String(m.id) === tempId ? item : m);
    if (kind === 'photo') recordStreakDailyQuest('photo', file.name);
    if (kind === 'song') recordStreakDailyQuest('song', file.name);
    render();
    toast('Added to your shared scrapbook ♡');
  } catch (err) {
    feed = feed.filter(m => String(m.id) !== tempId);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    render();
    toast(err.message);
  }
});

// Setup audio event listeners
const musicAudio = $('#globalAudio');
if (musicAudio) {
  ['play', 'pause', 'loadedmetadata', 'durationchange', 'timeupdate', 'seeked'].forEach(type => {
    musicAudio.addEventListener(type, syncPlayer);
  });
  musicAudio.addEventListener('ended', () => stepSong(1));
}
$('#islandSeek')?.addEventListener('input', event => {
  const audio = $('#globalAudio');
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    audio.currentTime = Number(event.target.value) / 1000 * audio.duration;
  }
});

// Session restore
async function restoreSession() {
  try {
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        token = session.access_token;
        await refresh();
        setUser(me);
        void recordLoginStreak();
        recordStreakDailyQuest('login');
      }
    }
  } catch (e) {
    toast(e.message);
  } finally {
    document.body.classList.remove('is-restoring');
    $('#sessionRestore')?.classList.add('hidden');
  }
}

restoreSession();
render();


// Photo and song media loading feedback. These listeners are delegated so
// cards rendered later receive the same polished loading and error states.
document.addEventListener('load', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.classList.contains('feed-photo')) return;
  image.classList.remove('is-loading', 'has-load-error');
  image.classList.add('is-loaded');
}, true);
document.addEventListener('error', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.classList.contains('feed-photo')) return;
  image.classList.remove('is-loading', 'is-loaded');
  image.classList.add('has-load-error');
}, true);

const sharedAudioElement = document.querySelector('#globalAudio');
sharedAudioElement?.addEventListener('playing', () => {
  document.querySelectorAll('[data-play-song].is-buffering').forEach(button => button.classList.remove('is-buffering', 'is-loading'));
});
sharedAudioElement?.addEventListener('canplay', () => {
  document.querySelectorAll('[data-play-song].is-buffering').forEach(button => button.classList.remove('is-buffering'));
});
sharedAudioElement?.addEventListener('waiting', () => {
  const activeId = playlist[playlistIndex]?.id;
  const button = [...document.querySelectorAll('[data-play-song]')].find(item => String(item.dataset.playSong) === String(activeId));
  button?.classList.add('is-buffering');
});
sharedAudioElement?.addEventListener('playing', () => {
  const activeId = playlist[playlistIndex]?.id;
  const button = [...document.querySelectorAll('[data-play-song]')].find(item => String(item.dataset.playSong) === String(activeId));
  button?.classList.remove('is-buffering', 'is-loading');
});

// Restore the original PR #115 global boing feedback for every enabled button.
document.addEventListener('click', event => {
  const button = event.target.closest?.('button, [role="button"]');
  if (!button || button.closest('#nav, nav, #coupleBearGame') || button.disabled) return;
  playCuteSound('boing');
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const gate = $('#notificationGate');
  if (!gate || gate.classList.contains('hidden')) return;
  gate.classList.add('hidden');
  void dismissViewedNotifications();
});
