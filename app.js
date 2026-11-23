const $ = s => document.querySelector(s), cfg = window.CUTE_BUNNY_CONFIG || {};

// Keep the expanded player outside the sticky header's backdrop-filter stacking
// context, so it can sample and blur the wallpaper behind the whole panel.
const nowPlayingPanelElement = document.getElementById('nowPlayingPanel');
const appRootElement = document.getElementById('app');
if (nowPlayingPanelElement && appRootElement && nowPlayingPanelElement.parentElement !== appRootElement) {
  appRootElement.appendChild(nowPlayingPanelElement);
}
const sb = window.supabase && cfg.supabaseUrl && !cfg.supabaseUrl.startsWith('PASTE_')
  ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

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
function getKindness() {
  return kindLines[currentKindnessIndex % kindLines.length];
}

function rollKindness() {
  let next;
  do {
    next = Math.floor(Math.random() * kindLines.length);
  } while (kindLines.length > 1 && next === currentKindnessIndex);
  currentKindnessIndex = next;
  const p = $('#compliment');
  if (p) {
    p.textContent = getKindness();
    p.classList.remove('kindness-pop');
    void p.offsetWidth;
    p.classList.add('kindness-pop');
  }

  toast('A little drop of kindness for you ♡');
}

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

const esc = s => String(s || '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

async function optimizePhotoUpload(file) {
  if (!file || file.type === 'image/gif' || !/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
  if (typeof createImageBitmap !== 'function') return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1200 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], baseName + '.webp', { type: 'image/webp', lastModified: file.lastModified });
  } catch (error) {
    console.warn('Photo optimization skipped:', error?.message || error);
    return file;
  } finally {
    bitmap?.close?.();
  }
}

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

async function api(path, options = {}) {
  if (!sb) throw Error('Add your Supabase URL and publishable key in supabase-config.js first.');
  const method = options.method || 'GET';
  const body = options.body && !(options.body instanceof FormData) ? JSON.parse(options.body) : options.body;
  const fail = e => { if (e) throw Error(e.message || 'Something went wrong.'); };

  if (path === '/auth/register') {
    const { data, error } = await sb.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        emailRedirectTo: new URL('./', window.location.href).toString(),
        data: { username: body.username.toLowerCase(), display_name: body.displayName }
      }
    });
    if (error) {
      const message = (error.message || '').toLowerCase();
      if (message.includes('already registered')) throw Error('An account with that email already exists. Switch to Sign in ♡');
      if (message.includes('database error saving new user')) throw Error('We could not create your profile. That username may already be taken; try another one.');
      fail(error);
    }
    return { token: data.session?.access_token || '', user: data.user, needsEmailConfirm: !data.session };
  }

  if (path === '/auth/login') {
    const identifier = body.email.trim();
    if (identifier.includes('@')) {
      const { data, error } = await sb.auth.signInWithPassword({ email: identifier, password: body.password });
      fail(error);
      if (!data.session) throw Error('Your email is not confirmed yet. Check your inbox or ask the project owner to turn off email confirmation.');
      return { token: data.session.access_token, user: data.user };
    }
    const { data, error } = await sb.functions.invoke('username-login', { body: { identifier, password: body.password } });
    if (error) throw Error('Username sign-in service error: ' + (error.message || 'request failed') + '. Try your email, or check that username-login is deployed in Supabase.');
    if (data?.error) throw Error(data.error);
    const { data: sessionData, error: sessionError } = await sb.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    fail(sessionError);
    return { token: sessionData.session.access_token, user: sessionData.user };
  }

  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw Error('Please sign in again.');

  if (path === '/me' && method === 'GET') {
    const profileFields = 'id,username,display_name,bio,theme,mascot,profile_wallpaper,gender,created_at,login_streak,last_login_date,streak_timezone';
    const [{ data, error }, { data: settings, error: settingsError }] = await Promise.all([
      sb.from('profiles').select(profileFields).eq('id', session.user.id).single(),
      sb.from('profile_private_settings').select('notification_preferences').eq('user_id', session.user.id).maybeSingle()
    ]);
    fail(error);
    fail(settingsError);
    const heartCounts = await fetchFriendHeartCounts([session.user.id]);
    return {
      ...data,
      heartCount: heartCounts?.get(String(session.user.id)) ?? null,
      notification_preferences: settings?.notification_preferences || { memories: true, buddy: true },
      displayName: data.display_name
    };
  }

  if (path === '/me' && method === 'PUT') {
    const username = String(body.username || me?.username || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(username)) throw Error('Usernames need 3–24 letters, numbers, or underscores.');
    const profileFields = 'id,username,display_name,bio,theme,mascot,profile_wallpaper,gender,created_at,login_streak,last_login_date,streak_timezone';
    const notificationPreferences = body.notificationPreferences || me?.notification_preferences || { memories: true, buddy: true };
    const update = {
      username,
      display_name: body.displayName,
      bio: body.bio,
      theme: APP_THEMES.includes(body.theme) ? body.theme : (me?.theme || 'rose'),
      mascot: body.mascot,
      gender: ['male', 'female'].includes(body.gender) ? body.gender : (me?.gender || null)
    };
    const { data, error } = await sb.from('profiles')
      .update(update)
      .eq('id', session.user.id)
      .select(profileFields)
      .single();
    if (error) {
      if (username !== me?.username) throw Error('Run the latest Cute Bunny Supabase migrations before changing your username.');
      fail(error);
    }
    const { data: settings, error: settingsError } = await sb.from('profile_private_settings')
      .upsert({
        user_id: session.user.id,
        notification_preferences: notificationPreferences
      }, { onConflict: 'user_id' })
      .select('notification_preferences')
      .single();
    fail(settingsError);
    return {
      ...data,
      notification_preferences: settings.notification_preferences,
      displayName: data.display_name
    };
  }

  if (path === '/profile-wallpaper' && method === 'PUT') {
    const allowed = ['normal', 'blossom', 'clouds', 'starlight', 'hearts'];
    const wallpaper = String(body.wallpaper || 'normal');
    if (!allowed.includes(wallpaper)) throw Error('Choose a valid profile wallpaper.');
    const { data, error } = await sb.from('profiles').update({ profile_wallpaper: wallpaper })
      .eq('id', session.user.id).select('profile_wallpaper').single();
    fail(error);
    return data;
  }

  if (path.startsWith('/username-available?')) {
    const username = decodeURIComponent(path.split('=').slice(1).join('=')).toLowerCase();
    const { data, error } = await sb.from('profiles').select('id').eq('username', username).neq('id', session.user.id).maybeSingle();
    fail(error);
    return { available: !data };
  }

  if (path === '/notifications') {
    const { data, error } = await sb.from('notifications')
      .select('id,actor_id,kind,memory_id,message,created_at,read_at,actor:profiles!notifications_actor_id_fkey(username,display_name,mascot)')
      .order('created_at', { ascending: false }).limit(60);
    fail(error);
    return data || [];
  }

  if (path.startsWith('/notifications/') && method === 'DELETE') {
    const id = decodeURIComponent(path.slice('/notifications/'.length));
    if (!id || id === 'read' || id === 'read-all') throw Error('Invalid notification.');
    const { error } = await sb.from('notifications')
      .delete()
      .eq('id', id)
      .eq('recipient_id', session.user.id);
    fail(error);
    return {};
  }

  if (path === '/notifications/read' && method === 'PUT') {
    const ids = [...new Set((body.ids || []).map(String).filter(Boolean))];
    if (ids.length) {
      const { error } = await sb.from('notifications').update({ read_at: new Date().toISOString() })
        .in('id', ids).eq('recipient_id', session.user.id).is('read_at', null);
      fail(error);
    }
    return {};
  }

  if (path === '/notifications/read-all' && method === 'PUT') {
    const { error } = await sb.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
    fail(error);
    return {};
  }

  if (path === '/buddy-ping' && method === 'POST') {
    const { data, error } = await sb.rpc('send_buddy_ping');
    fail(error);
    return { sent: !!data };
  }

  if (path.startsWith('/feed')) {
    const offsetMatch = path.match(/[?&]offset=(\d+)/);
    const kindMatch = path.match(/[?&]kind=(photo|song|note)/);
    const limitMatch = path.match(/[?&]limit=(\d+)/);
    const beforeIdMatch = path.match(/[?&]beforeId=(\d+)/);
    const offset = Math.max(0, Number(offsetMatch?.[1]) || 0);
    const beforeId = Math.max(0, Number(beforeIdMatch?.[1]) || 0);
    const pageSize = Math.min(120, Math.max(1, Number(limitMatch?.[1]) || FEED_PAGE_SIZE));
    let memoriesQuery = sb.from('memories')
      .select('*,author:profiles!memories_owner_id_fkey(id,username,display_name,mascot,theme)')
      .order('created_at', { ascending: false }).order('id', { ascending: false });
    if (kindMatch) memoriesQuery = memoriesQuery.eq('kind', kindMatch[1]);
    if (beforeId && kindMatch?.[1] === 'note') {
      // Keyset pagination is stable when new messages arrive; inserting at the
      // newest end cannot shift the next historical page.
      memoriesQuery = memoriesQuery.lt('id', beforeId).order('id', { ascending: false });
    }
    const { data: rows, error } = beforeId && kindMatch?.[1] === 'note'
      ? await memoriesQuery.limit(pageSize)
      : await memoriesQuery.range(offset, offset + pageSize - 1);
    fail(error);

    let latestOwnNoteId = null;
    let ownNoteSeenCount = 0;
    if (!kindMatch || kindMatch[1] === 'note') {
      const [{ data: latestOwnNote, error: latestNoteError }, { data: ownReadCursors, error: ownReadError }] = await Promise.all([
        sb.from('memories').select('id').eq('owner_id', session.user.id).eq('kind', 'note').order('id', { ascending: false }).limit(1).maybeSingle(),
        sb.from('note_read_cursors').select('reader_id,last_read_message_id').eq('owner_id', session.user.id)
      ]);
      fail(latestNoteError);
      fail(ownReadError);
      latestOwnNoteId = latestOwnNote?.id ?? null;
      ownNoteSeenCount = latestOwnNoteId == null ? 0 : (ownReadCursors || []).filter(cursor => Number(cursor.last_read_message_id) >= Number(latestOwnNoteId)).length;
    }

    const memoryIds = (rows || []).map(memory => memory.id).filter(id => id != null);
    let likeRows = [];
    if (memoryIds.length) {
      const { data, error: likesError } = await sb.from('memory_likes')
        .select('memory_id,user_id')
        .in('memory_id', memoryIds);
      fail(likesError);
      likeRows = data || [];
    }
    const likesByMemory = new Map();
    for (const like of likeRows) {
      const key = String(like.memory_id);
      const state = likesByMemory.get(key) || { count: 0, likedByMe: false };
      state.count += 1;
      if (String(like.user_id) === String(session.user.id)) state.likedByMe = true;
      likesByMemory.set(key, state);
    }

    // Emoji reactions are stored independently from the single-heart like
    // toggle. Load the complete reaction set for each page of messages.
    let reactionRows = [];
    if (memoryIds.length) {
      const { data, error: reactionsError } = await sb.from('memory_reactions')
        .select('memory_id,user_id,emoji,created_at')
        .in('memory_id', memoryIds);
      fail(reactionsError);
      reactionRows = data || [];
    }
    const reactionsByMemory = new Map();
    for (const reaction of reactionRows) {
      const key = String(reaction.memory_id);
      const items = reactionsByMemory.get(key) || [];
      items.push(reaction);
      reactionsByMemory.set(key, items);
    }

    return (rows || []).map(m => {
      const likeState = likesByMemory.get(String(m.id)) || { count: 0, likedByMe: false };
      const author = Array.isArray(m.author) ? m.author[0] : (m.author || {});
      return {
        ...m,
        like_count: likeState.count,
        liked_by_me: likeState.likedByMe,
        reactions: reactionsByMemory.get(String(m.id)) || [],
        is_latest_own_note: m.kind === 'note' && String(m.id) === String(latestOwnNoteId),
        seen_by_count: m.kind === 'note' && String(m.id) === String(latestOwnNoteId) ? ownNoteSeenCount : 0,
        createdAt: m.created_at,
        fileName: m.file_name,
        contentType: m.content_type,
        storagePath: m.storage_path,
        author: {
          ...author,
          id: author.id || m.owner_id,
          displayName: author.display_name || author.username || 'Friend',
          username: author.username || 'friend',
          mascot: author.mascot || '🐰'
        }
      };
    });
  }

  if (path.startsWith('/users?q=')) {
    const q = decodeURIComponent(path.slice('/users?q='.length)).trim();
    const fields = 'id,username,display_name,bio,theme,mascot,profile_wallpaper,gender,created_at,login_streak,last_login_date,streak_timezone,last_active_at';
    const basic = 'id,username,display_name,bio,theme,mascot,profile_wallpaper,gender,created_at,last_active_at';
    let query = sb.from('profiles').select(fields).neq('id', session.user.id).order('username').limit(30);
    if (q) query = query.ilike('username', '%' + q + '%');
    let { data, error } = await query;
    if (error && /login_streak|last_login_date|streak_timezone/i.test(error.message || '')) {
      query = sb.from('profiles').select(basic).neq('id', session.user.id).order('username').limit(30);
      if (q) query = query.ilike('username', '%' + q + '%');
      ({ data, error } = await query);
    }
    fail(error);
    const { data: edges, error: fe } = await sb.from('follows').select('followed_id').eq('follower_id', session.user.id);
    fail(fe);
    const followed = new Set(edges.map(x => x.followed_id));
    const heartCounts = await fetchFriendHeartCounts(data.map(u => u.id));
    return data.map(u => ({ ...u, login_streak: Number(u.login_streak) || 0, displayName: u.display_name, isFollowing: followed.has(u.id), heartCount: heartCounts?.get(String(u.id)) ?? null }));
  }

  if (path === '/following') {
    const basic = 'followed_id,created_at,followed:profiles!follows_followed_id_fkey(id,username,display_name,bio,theme,mascot,profile_wallpaper,gender,created_at,last_active_at)';
    const fields = 'followed_id,created_at,followed:profiles!follows_followed_id_fkey(id,username,display_name,bio,theme,mascot,profile_wallpaper,gender,created_at,login_streak,last_login_date,streak_timezone,last_active_at)';
    let { data, error } = await sb.from('follows').select(fields).eq('follower_id', session.user.id).order('created_at', { ascending: false });
    if (error && /login_streak|last_login_date|streak_timezone/i.test(error.message || '')) {
      ({ data, error } = await sb.from('follows').select(basic).eq('follower_id', session.user.id).order('created_at', { ascending: false }));
    }
    fail(error);
    const mapped = data.map(edge => {
      const u = Array.isArray(edge.followed) ? edge.followed[0] : edge.followed;
      return u ? ({ ...u, login_streak: Number(u.login_streak) || 0, displayName: u.display_name, isFollowing: true, followedAt: edge.created_at }) : null;
    }).filter(Boolean);
    const heartCounts = await fetchFriendHeartCounts(mapped.map(user => user.id));
    return mapped.map(user => ({ ...user, heartCount: heartCounts?.get(String(user.id)) ?? null }));
  }

  if (path === '/notes/my-read-cursors') {
    const { data, error } = await sb.from('note_read_cursors')
      .select('owner_id,last_read_message_id')
      .eq('reader_id', session.user.id);
    fail(error);
    return data || [];
  }

  if (path === '/notes/seen-status') {
    const [{ data: latestNote, error: latestError }, { data: cursors, error: cursorsError }] = await Promise.all([
      sb.from('memories').select('id').eq('owner_id', session.user.id).eq('kind', 'note').order('id', { ascending: false }).limit(1).maybeSingle(),
      sb.from('note_read_cursors').select('reader_id,last_read_message_id').eq('owner_id', session.user.id)
    ]);
    fail(latestError);
    fail(cursorsError);
    const latestNoteId = latestNote?.id ?? null;
    const seenByCount = latestNoteId == null ? 0 : (cursors || []).filter(cursor => Number(cursor.last_read_message_id) >= Number(latestNoteId)).length;
    return { latestNoteId, seenByCount };
  }

  if (path.startsWith('/follow/')) {
    const username = decodeURIComponent(path.slice('/follow/'.length));
    const { data: user, error } = await sb.from('profiles').select('id').eq('username', username).single();
    fail(error);
    if (method === 'POST') {
      const { error: e } = await sb.from('follows').insert({ follower_id: session.user.id, followed_id: user.id });
      fail(e);
      return {};
    }
    const { error: e } = await sb.from('follows').delete().eq('follower_id', session.user.id).eq('followed_id', user.id);
    fail(e);
    return {};
  }

  if (path === '/memories' && method === 'POST') {
    const { data, error } = await sb.from('memories').insert({ owner_id: session.user.id, kind: body.kind, text: body.text }).select().single();
    fail(error);
    return data;
  }

  if (path.startsWith('/memories/') && method === 'DELETE') {
    const id = path.split('/').pop();
    const { data: m, error } = await sb.from('memories').select('id,owner_id,storage_path').eq('id', id).single();
    fail(error);
    if (m.storage_path) await sb.storage.from('memories').remove([m.storage_path]);
    const { error: e } = await sb.from('memories').delete().eq('id', id);
    fail(e);
    return {};
  }

  if (path === '/media' && method === 'POST') {
    const form = body;
    let file = form.get('file');
    const kind = form.get('kind'), caption = form.get('caption') || file.name;
    if (file.size > 8 * 1024 * 1024) throw Error('Choose a file under 8 MB.');
    const photoTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], songTypes = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm'];
    if (!(kind === 'photo' ? photoTypes.includes(file.type) : kind === 'song' ? songTypes.includes(file.type) : false)) {
      throw Error(kind === 'photo' ? 'Choose a JPG, PNG, WebP, or GIF image.' : 'Choose an MP3, MP4, OGG, WAV, or WebM audio file.');
    }
    if (kind === 'photo') file = await optimizePhotoUpload(file);
    const key = session.user.id + '/' + crypto.randomUUID() + '/' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const { error: ue } = await sb.storage.from('memories').upload(key, file, { contentType: file.type, upsert: false });
    fail(ue);
    const { data, error } = await sb.from('memories').insert({
      owner_id: session.user.id, kind, text: caption, file_name: file.name, content_type: file.type, storage_path: key
    }).select().single();
    if (error) {
      await sb.storage.from('memories').remove([key]);
      fail(error);
    }
    return data;
  }
  throw Error('That action is not available.');
}

function toast(msg) {
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
  window.cuteToast = setTimeout(() => t.classList.remove('show'), 2800);
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

function mergeFeedRows(rows) {
  const byId = new Map(feed.map(item => [String(item.id), item]));
  for (const row of rows || []) byId.set(String(row.id), { ...byId.get(String(row.id)), ...row });
  feed = [...byId.values()].sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));
}

async function loadLatestMedia(kind) {
  if (!me || !['photo', 'song'].includes(kind) || mediaPageLoading[kind]) return;
  mediaPageLoading[kind] = true;
  try {
    const latest = await api('/feed?kind=' + kind + '&limit=8');
    if (page !== (kind === 'photo' ? 'gallery' : 'music')) { mergeFeedRows(latest); return; }
    mergeFeedRows(latest);
    mediaInitialLoaded[kind] = true;
    feedPageOffsets[kind] = latest.length;
    feedPageHasMore[kind] = latest.length === 8;
    mediaVisibleCount[kind] = 8;
    mediaPageLoading[kind] = false;
    render();
    $('#profileSettingsPanel')?.classList.add('hidden');
  } catch (error) {
    console.warn('Latest ' + kind + ' memories could not be loaded:', error?.message || error);
    toast('Some recent ' + (kind === 'photo' ? 'photos' : 'songs') + ' could not be loaded.');
  } finally { mediaPageLoading[kind] = false; observeFeedHistory(); }
}

function setFeedHistoryLoading(loading) {
  document.querySelectorAll('[data-history-loader]').forEach(node => { node.hidden = !loading; });
}

async function loadMoreFeed() {
  if (feedLoadingMore || !me) return;
  const kind = page === 'notes' ? 'note' : page === 'gallery' ? 'photo' : page === 'music' ? 'song' : 'all';
  if (!feedPageHasMore[kind] || (kind !== 'all' && kind !== 'note' && mediaPageLoading[kind])) return;
  feedLoadingMore = true; setFeedHistoryLoading(true);
  const previousScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  try {
    const offset = feedPageOffsets[kind];
    const query = kind === 'note'
      ? (noteHistoryCursor ? '/feed?kind=note&beforeId=' + encodeURIComponent(noteHistoryCursor) + '&limit=' + FEED_PAGE_SIZE : '')
      : kind === 'all' ? '/feed?offset=' + offset : '/feed?kind=' + kind + '&offset=' + offset;
    if (!query) return;
    const older = await api(query);
    if (kind === 'note') {
      if (older.length) noteHistoryCursor = String(older[older.length - 1].id);
    } else {
      feedPageOffsets[kind] += older.length;
      if (kind !== 'all') mediaVisibleCount[kind] += older.length;
    }
    feedPageHasMore[kind] = older.length === FEED_PAGE_SIZE;
    mergeFeedRows(older); feedHasMore = feedPageHasMore.all;
    if (page === 'notes') {
      renderNotesPage();
      requestAnimationFrame(observeFeedHistory);
    } else {
      render();
      requestAnimationFrame(() => { window.scrollTo({ top: previousScrollTop, behavior: 'auto' }); observeFeedHistory(); });
    }
  } catch (error) { toast(error?.message || 'Older memories could not be loaded.'); }
  finally { feedLoadingMore = false; setFeedHistoryLoading(false); }
}

function historySentinelMarkup(position = 'bottom') {
  return '<div class="memory-history-sentinel ' + position + '" data-history-sentinel aria-hidden="true"></div><div class="memory-history-loader" data-history-loader hidden role="status"><span class="memory-history-bunny" aria-hidden="true">🐰</span><span>Gathering little memories…</span></div>';
}

function observeFeedHistory() {
  feedHistoryObserver?.disconnect(); feedHistoryObserver = null;
  const sentinel = document.querySelector('[data-history-sentinel]');
  if (!sentinel || !('IntersectionObserver' in window)) return;
  const root = page === 'notes' ? $('#chatThread') : null;
  feedHistoryObserver = new IntersectionObserver(entries => {
    if (feedHistoryScrollArmed && entries.some(entry => entry.isIntersecting)) {
      feedHistoryScrollArmed = false;
      void loadMoreFeed();
    }
  }, { root, rootMargin: page === 'notes' ? '220px 0px 0px 0px' : '500px 0px' });
  feedHistoryObserver.observe(sentinel);
}

function tryAutoLoadFeedHistory() {
  if (!feedHistoryScrollArmed || feedLoadingMore) return;
  const sentinel = document.querySelector('[data-history-sentinel]');
  if (!sentinel) return;
  const rect = sentinel.getBoundingClientRect();
  const thread = page === 'notes' ? $('#chatThread') : null;
  // Notes history lives at the top of its own scroll container. Checking the
  // container's scroll position is more reliable than comparing sentinel and
  // viewport rectangles, which can diverge across mobile/desktop layouts.
  const near = page === 'notes'
    ? !!thread && thread.scrollTop <= 2
    : rect.top <= window.innerHeight + 500;
  if (near) {
    feedHistoryScrollArmed = false;
    void loadMoreFeed();
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

function formatMessageTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date(), yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const day = date.toDateString() === now.toDateString() ? 'Today' :
    date.toDateString() === yesterday.toDateString() ? 'Yesterday' :
    deviceDateFormatter.format(date);
  return day + ' · ' + deviceClockFormatter.format(date);
}

function formatNoteClock(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : deviceClockFormatter.format(date);
}

function noteDayLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Little memories';
  const today = new Date(), yesterday = new Date(today);
  today.setHours(0, 0, 0, 0);
  yesterday.setDate(today.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return day.getTime() === today.getTime() ? 'Today' : day.getTime() === yesterday.getTime() ? 'Yesterday' : new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone }).format(date);
}

function formatJoinDate(value) {
  if (!value) return 'A little while ago';
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) return 'A little while ago';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatLastActive(value) {
  if (!value) return 'Last active time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Last active time unavailable';
  const now = new Date();
  const dayKey = d => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayLabel = dayKey(date) === dayKey(now) ? 'Today' :
    dayKey(date) === dayKey(yesterday) ? 'Yesterday' :
    new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  const timeLabel = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  return 'Last active ' + dayLabel + ' at ' + timeLabel;
}

function friendRow(user, isOwnProfile = false) {
  const snapshot = streakFriendSnapshot(user);
  const flowerLabel = snapshot.count === null ? '🌸 — flower' : '🌸 ' + Number(snapshot.count).toLocaleString() + ' flower';
  const titleTag = user.gender === 'male' ? '👑 King' : user.gender === 'female' ? '👑 Queen' : '';
  const heartLabel = user.heartCount === null || user.heartCount === undefined
    ? '💖 — heart'
    : '💖 ' + Number(user.heartCount).toLocaleString() + ' heart';
  let liveState = {};
  try { liveState = presenceChannel?.presenceState?.() || {}; } catch {}
  const online = isPresenceUserOnline(user, liveState);
  const presenceLabel = '';
  const wallpaper = ['normal', 'blossom', 'clouds', 'starlight', 'hearts'].includes(user.profile_wallpaper) ? user.profile_wallpaper : 'normal';
  const action = isOwnProfile
    ? '<button class="primary follow-btn own-profile-action" type="button" data-open-own-profile>View profile</button>'
    : '<button class="primary follow-btn" type="button" data-follow="' + esc(user.username) + '" data-following="' + !!user.isFollowing + '">' + (user.isFollowing ? 'Following' : 'Follow ♡') + '</button>';
  return '<article class="friend-row ' + (online ? 'is-online' : 'is-offline') + (isOwnProfile ? ' own-profile-row' : '') + '" data-friend-id="' + esc(user.id) + '" data-profile="' + esc(user.username) + '" data-wallpaper="' + wallpaper + '" data-own-profile="' + (isOwnProfile ? 'true' : 'false') + '"><div class="friend-main"><span class="friend-avatar">' + esc(user.mascot || '🐰') + '<i class="friend-online-dot" aria-hidden="true"></i></span><span class="friend-copy"><span class="friend-name-line"><b>' + esc(user.displayName || user.display_name || user.username) + '</b><small>@' + esc(user.username) + '</small></span><span class="friend-meta-line"><small class="sg-friend-presence">' + esc(presenceLabel) + '</small></span><span class="friend-stat-plates">' + (titleTag ? '<small class="friend-row-queen">' + esc(titleTag) + '</small>' : '') + '<small class="friend-row-streak">' + esc(flowerLabel) + '</small><small class="friend-row-hearts">' + esc(heartLabel) + '</small></span></span></div>' + action + '</article>';
}


function streakBadge(count) {
  return count >= 30 ? '🌟 Love-garden legend' : count >= 7 ? '🌼 Week in bloom' : count >= 3 ? '🌱 Growing steadily' : count > 0 ? '🌷 First blossoms' : '✨ Fresh start';
}
function streakWidget() {
  const count = Math.max(0, Number(me?.login_streak) || 0);
  const subtitle = count ? count + (count === 1 ? ' day in a row' : ' days in a row') : 'Start your streak today ♡';
  const thumbnailLabel = count ? 'Open your ' + count + '-day streak garden' : 'Open your streak garden';
  return '<article class="tile streak-tile"><div class="tile-art streak-art streak-art-trigger" data-open-streak role="button" tabindex="0" aria-label="' + esc(thumbnailLabel) + '">' +
    '<span class="streak-plant-illustration streak-plant-svg" aria-hidden="true">' +
      '<svg viewBox="0 0 240 132" role="img" aria-hidden="true"><defs><linearGradient id="streak-pot" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5c8d5"/><stop offset="1" stop-color="#d98daa"/></linearGradient><linearGradient id="streak-leaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c0d6a9"/><stop offset="1" stop-color="#7fa47d"/></linearGradient></defs><ellipse cx="120" cy="120" rx="67" ry="7" fill="#a98a9b" opacity=".17"/><g class="streak-artwork"><path d="M120 105Q91 79 73 69M120 104Q119 69 120 47M121 104Q151 78 169 64" fill="none" stroke="#789b78" stroke-width="4" stroke-linecap="round"/><path d="M99 88Q69 61 57 82Q75 105 99 88ZM139 86Q165 57 184 75Q168 102 139 86Z" fill="url(#streak-leaf)" stroke="#739473" stroke-width="2"/><path d="M82 83q8 0 13 4M151 83q12-6 22-4" fill="none" stroke="#dce9ce" stroke-width="2" stroke-linecap="round"/><path d="M82 83q17-22 9-48M120 72Q99 53 91 35M121 65Q143 42 150 23" fill="none" stroke="#789b78" stroke-width="3.5" stroke-linecap="round"/><g transform="translate(91 29)"><g fill="#f3c4d3"><ellipse cy="-12" rx="6" ry="10"/><ellipse cy="12" rx="6" ry="10"/><ellipse cx="-12" rx="10" ry="6"/><ellipse cx="12" rx="10" ry="6"/><ellipse cx="-8.5" cy="-8.5" rx="6" ry="8"/><ellipse cx="8.5" cy="8.5" rx="6" ry="8"/></g><circle r="5" fill="#e7bd70"/><circle r="2" fill="#fff0bd"/></g><g transform="translate(151 22)"><g fill="#f8df9e"><ellipse cy="-11" rx="5.5" ry="9"/><ellipse cy="11" rx="5.5" ry="9"/><ellipse cx="-11" rx="9" ry="5.5"/><ellipse cx="11" rx="9" ry="5.5"/><ellipse cx="-8" cy="-8" rx="5.5" ry="7.5"/><ellipse cx="8" cy="8" rx="5.5" ry="7.5"/></g><circle r="4.5" fill="#c58e70"/></g><g transform="translate(120 44)"><g fill="#dfc6e9"><ellipse cy="-9" rx="5" ry="7.5"/><ellipse cy="9" rx="5" ry="7.5"/><ellipse cx="-9" rx="7.5" ry="5"/><ellipse cx="9" rx="7.5" ry="5"/></g><circle r="3.8" fill="#e6c477"/></g><path d="M79 94Q120 101 161 94L153 119Q120 130 87 119Z" fill="url(#streak-pot)" stroke="#c77f9e" stroke-width="2.5"/><path d="M77 94Q120 103 163 94L160 103Q120 111 80 103Z" fill="#f8dce5" stroke="#c77f9e" stroke-width="2"/><path d="M101 110q19-12 38 0-19 13-38 0Z" fill="#fff2f4" opacity=".95"/><path d="M120 106v9" stroke="#c77f9e" stroke-width="1.5"/><path d="M93 114q27 8 54 0" fill="none" stroke="#fff5f5" stroke-width="1.5" opacity=".8"/><path d="m43 34 3 7 7 3-7 3-3 7-3-7-7-3 7-3Zm151 22 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#d5b36e"/><path d="M183 19c-5-7-15-2-11 5 2 4 11 10 11 10s9-6 11-10c4-7-6-12-11-5Z" fill="#e7a9bd"/></g></svg></span></div>' +
    '<h3>Your streak</h3><p data-streak-live-subtitle title="' + esc(subtitle) + '">' + esc(subtitle) + '</p><button type="button" class="primary streak-open-button" data-open-streak>Open streak →</button></article>';
}

function syncStreakWidget() {
  const count = Math.max(0, Number(me?.login_streak) || 0);
  const subtitle = count ? count + (count === 1 ? ' day in a row' : ' days in a row') : 'Start your streak today ♡';
  document.querySelectorAll('[data-streak-live-subtitle]').forEach(node => {
    node.textContent = subtitle;
    node.title = subtitle;
  });
  const thumbnail = document.querySelector('.streak-art-trigger[data-open-streak]');
  if (thumbnail) thumbnail.setAttribute('aria-label', count ? 'Open your ' + count + '-day streak garden' : 'Open your streak garden');
}

async function recordLoginStreak() {
  if (!me || !sb) return;
  const userId = me.id;
  const timezone = normalizeStreakTimeZone(getBrowserStreakTimeZone());
  const today = streakDateInTimeZone(timezone);
  const cacheKey = 'cuteBunnyStreak:' + userId;
  const attemptKey = userId + ':' + timezone + ':' + today;
  if (streakRecordInFlight && streakRecordInFlightKey === attemptKey) return streakRecordInFlight;

  let saved = { count: 0, date: '' };
  try { saved = JSON.parse(localStorage.getItem(cacheKey) || '{}'); } catch {}
  const legacyCount = Math.max(0, Math.min(3650, Number(saved.count) || 0));
  const legacyDate = /^\d{4}-\d{2}-\d{2}$/.test(String(saved.date || '')) ? saved.date : null;

  const request = (async () => {
    try {
      const { data, error } = await sb.rpc('record_login_streak_for_timezone', {
        p_timezone: timezone,
        p_legacy_count: legacyCount,
        p_legacy_date: legacyDate
      });
      if (error) throw error;
      if (me?.id !== userId) return;
      const result = Array.isArray(data) ? data[0] : data;
      const count = Number(result?.login_streak);
      const date = String(result?.last_login_date || '').slice(0, 10);
      if (!Number.isInteger(count) || count < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('The streak service returned an invalid count.');
      }
      me.login_streak = count;
      me.last_login_date = date;
      me.streak_timezone = normalizeStreakTimeZone(result?.streak_timezone || timezone);
      streakCountdownDayKey = streakDateInTimeZone(me.streak_timezone);
      try { localStorage.setItem(cacheKey, JSON.stringify({ count, date })); } catch {}
      saveStreakHistory(date, count);
      saveStreakMilestones(count);
      syncStreakWidget();
      if (page === 'streak') renderStreakPage();
    } catch (error) {
      console.error('Could not sync login streak:', error);
      if (me?.id === userId) toast('Your streak could not sync. Check your connection and reopen Cute Bunny.');
    }
  })();

  streakRecordInFlightKey = attemptKey;
  streakRecordInFlight = request;
  try {
    await request;
  } finally {
    if (streakRecordInFlight === request) {
      streakRecordInFlight = null;
      streakRecordInFlightKey = '';
    }
  }
}


function streakStorageKey(suffix) {
  return 'cuteBunnyStreak:' + String(me?.id || me?.username || 'guest') + ':' + suffix;
}

function readStreakHeartMilestones() {
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('heart-milestones')) || '[]');
    return new Set(Array.isArray(saved) ? saved.map(Number) : []);
  } catch { return new Set(); }
}
function saveStreakHeartMilestones(count) {
  const earned = readStreakHeartMilestones();
  [10, 100, 250, 500, 750, 1000].forEach(value => { if (count >= value) earned.add(value); });
  try { localStorage.setItem(streakStorageKey('heart-milestones'), JSON.stringify([...earned].sort((a,b) => a-b))); } catch {}
}
function readStreakDailyQuests(dateKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('daily-quests:' + dateKey)) || '{}');
    return {
      hearts: Array.isArray(saved.hearts) ? [...new Set(saved.hearts.map(String))] : [],
      photo: saved.photo === true,
      photoCount: Math.max(saved.photo === true ? 1 : 0, Number(saved.photoCount) || 0),
      kissNote: saved.kissNote === true,
      kissNotes: Math.max(saved.kissNote === true ? 1 : 0, Number(saved.kissNotes) || 0),
      note: Math.max(0, Number(saved.note) || 0),
      noteTexts: Array.isArray(saved.noteTexts) ? saved.noteTexts.slice(-80).map(String) : [],
      song: saved.song === true,
      songCount: Math.max(saved.song === true ? 1 : 0, Number(saved.songCount) || 0),
      login: saved.login === true,
      badge: saved.badge === true
    };
  } catch { return {hearts:[], photo:false, photoCount:0, kissNote:false, kissNotes:0, note:0, noteTexts:[], song:false, songCount:0, login:false, badge:false}; }
}
function writeStreakDailyQuests(dateKey, state) {
  try { localStorage.setItem(streakStorageKey('daily-quests:' + dateKey), JSON.stringify(state)); } catch {}
}
function getDailyQuestRotation(dateKey) {
  // A shared 20-day journey: one fresh chat quest, one photo quest,
  // and one community quest each day. Each category has 20 unique entries.
  const chatQuests = [
    ['Warm hello','Send a message that includes “hello”.','note','note','hello'],
    ['A happy thought','Share a message with the word “happy”.','note','note','happy'],
    ['A little thank-you','Send someone a thank-you message.','note','note','thank'],
    ['Dream big','Tell someone about a dream or wish.','note','note','dream'],
    ['Something beautiful','Share a thought using the word “beautiful”.','note','note','beautiful'],
    ['Morning sunshine','Send a good-morning message.','note','note','morning'],
    ['Moonlight wishes','Send a good-night message.','note','note','night'],
    ['Kind words','Send a message with the word “kind”.','note','note','kind'],
    ['Tiny victory','Share a little win from your day.','note','note','win'],
    ['A note of appreciation','Tell someone what you appreciate.','note','note','appreciate'],
    ['Favourite melody','Talk about a song you love.','note','note','song'],
    ['A memory to keep','Share a message about a favourite memory.','note','note','remember'],
    ['You can do it','Send someone an encouraging message.','note','note','proud'],
    ['A heart in words','Send a message with a heart symbol.','note','note','♡'],
    ['A hopeful note','Share something you are hopeful about.','note','note','hope'],
    ['How was your day?','Ask someone how their day is going.','note','note','day'],
    ['Pass on a smile','Send a message with the word “smile”.','note','note','smile'],
    ['A little love','Send a message that includes “love”.','note','note','love'],
    ['Three little messages','Send three chat messages today.','note','note',null,3],
    ['Keep the conversation going','Send five chat messages today.','note','note',null,5]
  ];
  const photoQuests = [
    ['Sky postcard','Share a photo of the sky.','photo','photo'],
    ['A favourite colour','Share a photo featuring your favourite colour.','photo','photo'],
    ['Little piece of nature','Share a photo of something from nature.','photo','photo'],
    ['Cosy corner','Share a photo of a cosy place or corner.','photo','photo'],
    ['A tasty moment','Share a photo of something you enjoyed eating.','photo','photo'],
    ['Tiny details','Share a close-up photo of an interesting detail.','photo','photo'],
    ['Flower of the day','Share a photo of a flower or plant.','photo','photo'],
    ['Golden hour','Share a photo in warm evening light.','photo','photo'],
    ['A view worth keeping','Share a photo of a view you love.','photo','photo'],
    ['Something handmade','Share a photo of something you made.','photo','photo'],
    ['A bookish moment','Share a photo of a book, page, or reading spot.','photo','photo'],
    ['Everyday beauty','Share a photo of something ordinary but lovely.','photo','photo'],
    ['Pet or animal friend','Share a photo of an animal.','photo','photo'],
    ['A little celebration','Share a photo of something that made you smile.','photo','photo'],
    ['Rainy-day mood','Share a photo that captures a rainy-day feeling.','photo','photo'],
    ['Your creative side','Share a photo of your art or creative work.','photo','photo'],
    ['A special keepsake','Share a photo of an object you treasure.','photo','photo'],
    ['Two tiny moments','Share two photos from your day.','photo','photo',null,2],
    ['A mini photo story','Share two photos that tell a little story.','photo','photo',null,2],
    ['Photo diary','Share three photos that capture your day.','photo','photo',null,3]
  ];
  const communityQuests = [
    ['Three hearts of kindness','Leave hearts on three different memories.','heart','hearts',null,3],
    ['A song to share','Share a song with your friends.','song','song'],
    ['Garden hello','Visit your little garden today.','login','login'],
    ['Five kind reactions','Leave hearts on five different memories.','heart','hearts',null,5],
    ['A soundtrack for today','Share a song that matches your mood.','song','song'],
    ['A little appreciation','Leave hearts on three memories from others.','heart','hearts',null,3],
    ['Music for the moment','Share another song you enjoy.','song','song'],
    ['A friendly visit','Check in and keep your streak growing.','login','login'],
    ['Spread the sunshine','Like five memories that brighten your day.','heart','hearts',null,5],
    ['A peaceful melody','Share a calm song.','song','song'],
    ['Three thoughtful hearts','Send hearts to three different memories.','heart','hearts',null,3],
    ['Back to the garden','Visit your garden and care for your streak.','login','login'],
    ['Celebrate a creator','Leave hearts on five memories.','heart','hearts',null,5],
    ['Share your soundtrack','Share a song you would recommend.','song','song'],
    ['A little wave','Check in to your garden today.','login','login'],
    ['Kindness all around','Like three memories from other people.','heart','hearts',null,3],
    ['One more melody','Share a song that makes you smile.','song','song'],
    ['Garden regular','Keep your daily streak alive.','login','login'],
    ['Five bright hearts','Leave hearts on five lovely memories.','heart','hearts',null,5],
    ['Music for everyone','Share one final song for today.','song','song']
  ];

  // Day 1 began on 2026-11-21. Every account sees the same set on each date.
  const campaignStart = '2026-11-21';
  const startDate = new Date(campaignStart + 'T00:00:00Z');
  const currentDate = new Date(dateKey + 'T00:00:00Z');
  const elapsedDays = Number.isFinite(startDate.getTime()) && Number.isFinite(currentDate.getTime())
    ? Math.max(0, Math.floor((currentDate - startDate) / 86400000)) : 0;
  const dayIndex = elapsedDays % 20;
  const entries = [chatQuests[dayIndex], photoQuests[dayIndex], communityQuests[dayIndex]];

  return entries.map((entry, slot) => {
    const [title, description, kind, art, match, target = 1] = entry;
    const id = 'day-' + (dayIndex + 1) + '-quest-' + (slot + 1);
    const progress = state => {
      if (kind === 'heart') return Math.min(target, state.hearts.length);
      if (kind === 'photo') return Math.min(target, state.photoCount);
      if (kind === 'song') return Math.min(target, state.songCount);
      if (kind === 'kiss-note') return Math.min(target, state.kissNotes);
      if (kind === 'login') return state.login ? 1 : 0;
      if (kind === 'note' && match) return Math.min(target, state.noteTexts.filter(text => text.toLowerCase().includes(match)).length);
      return Math.min(target, state.note);
    };
    return {id,title,description,target,art,kind,match,progress,done:state => progress(state) >= target};
  });
}
/* Preview-only Petal Points: local, per-account reward ledger. */
function readPetalRewards() {
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('petal-rewards')) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch { return {}; }
}
function petalRewardBalance(rewards = readPetalRewards()) {
 const pending=Object.values(rewards).reduce((sum,amount)=>{const value=Number(amount);return sum+(Number.isFinite(value)&&value>0?Math.trunc(value):0);},0);
 return Math.max(0,Math.trunc(Number(cloudPetalPoints)||0)+pending);
}
async function syncPetalPointsToCloud() {
 if(!sb||!me?.id)return false;
 if(petalPointsSyncInFlight)return petalPointsSyncInFlight;
 const userId=String(me.id);
 petalPointsSyncInFlight=(async()=>{
  const pending=readPetalRewards();
  for(const [key,rawAmount] of Object.entries(pending)){
   const amount=Math.trunc(Number(rawAmount)); if(!key||!Number.isFinite(amount)||amount<1)continue;
   const {data,error}=await sb.rpc('grant_petal_points',{p_grant_key:String(key),p_amount:amount});
   if(error)throw error;
   if(String(me?.id||'')!==userId)return false;
   if(data&&Number.isFinite(Number(data.petal_points)))cloudPetalPoints=Math.max(0,Number(data.petal_points));
   const latest=readPetalRewards();
   if(Number(latest[key])===Number(rawAmount)){delete latest[key];try{localStorage.setItem(streakStorageKey('petal-rewards'),JSON.stringify(latest));}catch{return false;}}
  }
  return true;
 })();
 try{return await petalPointsSyncInFlight;}
 catch(error){console.warn('Petal Points sync failed; pending rewards were retained:',error?.message||error);return false;}
 finally{petalPointsSyncInFlight=null;}
}
function awardPetalReward(key,amount,sync=true){
 if(!me||!key)return false;
 const rewardAmount=Math.trunc(Number(amount));
 if(!Number.isFinite(rewardAmount)||rewardAmount<1||rewardAmount>1000)return false;
 const rewards=readPetalRewards();if(Object.prototype.hasOwnProperty.call(rewards,key))return false;
 rewards[key]=rewardAmount;
 try{localStorage.setItem(streakStorageKey('petal-rewards'),JSON.stringify(rewards));}catch{return false;}
 if(sync)void syncPetalPointsToCloud();return true;
}
function readGardenCollection() {
  try {
    const value = JSON.parse(localStorage.getItem(streakStorageKey('garden-collection')) || '{}');
    return { owned: Array.isArray(value.owned) ? value.owned : [], equippedItems: Array.isArray(value.equippedItems) ? value.equippedItems : [value.equipped, value.bunny].filter(id => id && id !== 'none'), equipped: value.equipped || 'none', bunny: value.bunny || 'none' };
  } catch { return { owned: [], equippedItems: [], equipped: 'none', bunny: 'none' }; }
}
function saveGardenCollection(value) {
  try {
    localStorage.setItem(streakStorageKey('garden-collection'), JSON.stringify(value));
    // Keep the local change marked until the cloud confirms it. A later hydration
    // can safely retry instead of silently discarding an offline equip action.
    localStorage.setItem(streakStorageKey('garden-collection-pending-sync'), '1');
    return true;
  } catch { return false; }
}

let friendGardenRequestSequence = 0;
let gardenCollectionHydratedUserId = '';
let gardenCollectionReadyUserId = '';
let gardenCollectionHydration = Promise.resolve();
let gardenPurchaseInFlight = false;
function normalizeGardenCollection(value = {}) {
  const validIds = new Set(GARDEN_COLLECTIBLES.map(item => item.id));
  const owned = Array.isArray(value.owned) ? [...new Set(value.owned.filter(id => validIds.has(id)))] : [];
  const legacyEquipped = [value.equipped, value.bunny].filter(id => id && id !== 'none');
  const equippedItems = [...new Set((Array.isArray(value.equipped_items) ? value.equipped_items : Array.isArray(value.equippedItems) ? value.equippedItems : legacyEquipped).filter(id => owned.includes(id)))];
  return {
    owned,
    equippedItems,
    equipped: equippedItems.find(id => GARDEN_COLLECTIBLES.find(item => item.id === id)?.type === 'garden') || 'none',
    bunny: equippedItems.find(id => GARDEN_COLLECTIBLES.find(item => item.id === id)?.type === 'bunny') || 'none'
  };
}
async function syncGardenCollectionToCloud(value = readGardenCollection()) {
  if (!sb || !me?.id) return false;
  const userId = String(me.id);
  const normalized = normalizeGardenCollection(value);
  const { error } = await sb.from('profile_garden_collections').upsert({
    user_id: userId,
    owned: normalized.owned,
    equipped: normalized.equipped,
    bunny: normalized.bunny,
    equipped_items: normalized.equippedItems,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (error) {
    console.warn('Garden collection sync failed:', error.message || error);
    return false;
  }
  // Never write one account's response into another account's local cache.
  if (String(me?.id || '') !== userId) return false;
  try {
    localStorage.setItem(streakStorageKey('garden-collection'), JSON.stringify(normalized));
    localStorage.setItem(streakStorageKey('garden-collection-reconciled'), '1');
    localStorage.removeItem(streakStorageKey('garden-collection-pending-sync'));
  } catch {}
  return true;
}
async function hydrateGardenCollectionFromCloud() {
  if (!sb || !me?.id) return readGardenCollection();
  const userId = String(me.id);
  const { data, error } = await sb.from('profile_garden_collections')
    .select('owned,equipped,bunny,equipped_items,petal_points')
    .eq('user_id', userId)
    .maybeSingle();
  if (String(me?.id || '') !== userId) return readGardenCollection();
  if (error) {
    console.warn('Garden collection could not be loaded:', error.message || error);
    return readGardenCollection();
  }
  if (data) {
    cloudPetalPoints = Math.max(0, Number(data.petal_points) || 0);
    // Ownership is permanent once purchased: merge cloud and locally saved ownership
    // so a stale/empty copy cannot make a paid-for item appear purchasable again.
    const localCollection = normalizeGardenCollection(readGardenCollection());
    const cloudCollection = normalizeGardenCollection(data);
    const purchaseLedger = readPetalRewards();
    const ledgerOwned = GARDEN_COLLECTIBLES
      .filter(item => Object.prototype.hasOwnProperty.call(purchaseLedger, 'purchase:' + item.id))
      .map(item => item.id);
    // Import equipped selections from older local caches once, and whenever a
    // local equip action is still pending. After successful reconciliation, the
    // cloud becomes authoritative so an old device cannot undo a later unequip.
    const needsLocalEquipmentRecovery =
      localStorage.getItem(streakStorageKey('garden-collection-reconciled')) !== '1' ||
      localStorage.getItem(streakStorageKey('garden-collection-pending-sync')) === '1';
    const normalized = normalizeGardenCollection({
      ...data,
      owned: [...new Set([...cloudCollection.owned, ...localCollection.owned, ...ledgerOwned])],
      equippedItems: needsLocalEquipmentRecovery
        ? [...new Set([...cloudCollection.equippedItems, ...localCollection.equippedItems])]
        : cloudCollection.equippedItems
    });
    const cloudEquipmentsDiffer = normalized.equippedItems.length !== cloudCollection.equippedItems.length
      || normalized.equippedItems.some(id => !cloudCollection.equippedItems.includes(id));
    const cloudOwnershipDiffers = normalized.owned.length !== cloudCollection.owned.length
      || normalized.owned.some(id => !cloudCollection.owned.includes(id));
    if (cloudOwnershipDiffers || cloudEquipmentsDiffer) {
      await syncGardenCollectionToCloud(normalized);
    } else {
      try {
        localStorage.setItem(streakStorageKey('garden-collection'), JSON.stringify(normalized));
        localStorage.setItem(streakStorageKey('garden-collection-reconciled'), '1');
        localStorage.removeItem(streakStorageKey('garden-collection-pending-sync'));
      } catch {}
    }
    return normalized;
  }
  const legacy = normalizeGardenCollection(readGardenCollection());
  cloudPetalPoints = 0;
  await syncGardenCollectionToCloud(legacy);
  return legacy;
}
function friendGardenCollectionCacheKey(userId) {
  return 'cuteBunnyFriendGarden:' + String(userId);
}
function renderFriendGardenCollection(collection, userId, isOwnProfile = false) {
  const gate = $('#friendProfileGate');
  if (!gate || gate.dataset.collectionUserId !== String(userId)) return;
  const section = $('#friendProfileCollection');
  const catalog = typeof GARDEN_COLLECTIBLES !== 'undefined' ? GARDEN_COLLECTIBLES : [];
  const equippedIds = new Set(collection.equippedItems || [collection.equipped, collection.bunny].filter(id => id && id !== 'none'));
  const ownedItems = catalog.filter(item => collection.owned.includes(item.id) && equippedIds.has(item.id));
  const count = $('#friendProfileCollectionCount');
  if (count) {
    count.textContent = ownedItems.length + (ownedItems.length === 1 ? ' treasure' : ' treasures');
    count.hidden = false;
  }
  const list = $('#friendProfileCollectionItems');
  if (!list) return;
  if (!ownedItems.length) {
    if (section) section.hidden = !isOwnProfile;
    list.innerHTML = isOwnProfile ? '<p class="friend-profile-empty">Collect your treasures in the shop ♡</p>' : '';
    return;
  }
  if (section) section.hidden = false;
  list.innerHTML = ownedItems.map(item => {
    const equipped = (collection.equippedItems || [collection.equipped, collection.bunny]).includes(item.id);
    return '<span class="friend-profile-collection-item garden-rarity-' + esc(item.rarity || 'common') + (equipped ? ' is-equipped' : '') + '" title="' + esc(item.name) + '" aria-label="' + esc(item.name + (equipped ? ', equipped' : '')) + '"><span class="friend-profile-collection-art">' + item.art + '<i class="sg-art-glint" aria-hidden="true">✧</i></span><small class="friend-profile-collection-name">' + esc(item.name) + '</small>' + (equipped ? '<i class="friend-profile-equipped-mark" aria-label="Equipped">✦</i>' : '') + '</span>';
  }).join('');
}
async function loadFriendGardenCollection(user, isOwnProfile) {
  const sequence = ++friendGardenRequestSequence;
  const gate = $('#friendProfileGate');
  if (!gate || !user?.id) return;
  gate.dataset.collectionUserId = String(user.id);
  let collection;
  if (isOwnProfile) {
    collection = await hydrateGardenCollectionFromCloud();
    const petalsNode = $('#friendProfilePetals');
    if (petalsNode && gate.dataset.collectionUserId === String(user.id)) petalsNode.textContent = petalRewardBalance().toLocaleString();
  } else {
    if (!sb) return;
    try {
      const { data, error } = await sb.from('profile_garden_collections')
        .select('owned,equipped,bunny,equipped_items,petal_points')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      collection = normalizeGardenCollection(data || {});
      const petalsNode = $('#friendProfilePetals');
      if (petalsNode && gate.dataset.collectionUserId === String(user.id)) petalsNode.textContent = Math.max(0, Number(data?.petal_points) || 0).toLocaleString();
      try { localStorage.setItem(friendGardenCollectionCacheKey(user.id), JSON.stringify(collection)); } catch {}
    } catch (error) {
      console.warn('Friend garden collection could not be loaded:', error?.message || error);
      return;
    }
  }
  if (sequence !== friendGardenRequestSequence || gate.dataset.collectionUserId !== String(user.id)) return;
  renderFriendGardenCollection(collection, user.id, isOwnProfile);
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
];
function updateGardenShopItem(id, collection) {
  const normalized = normalizeGardenCollection(collection);
  GARDEN_COLLECTIBLES.forEach(item => {
    const card = document.querySelector('.sg-collectible-card [data-buy-collectible="' + item.id + '"]')?.closest('.sg-collectible-card');
    const button = card?.querySelector('[data-buy-collectible]');
    if (!card || !button) return;
    const owned = normalized.owned.includes(item.id);
    const equipped = normalized.equippedItems.includes(item.id);
    card.classList.toggle('is-equipped', equipped);
    button.textContent = equipped ? 'Equipped ✓' : owned ? 'Equip' : item.cost + ' petals · Collect';
    button.disabled = !owned && petalRewardBalance() < item.cost;
    button.setAttribute('aria-label', equipped ? 'Unequip ' + item.name : owned ? 'Equip ' + item.name : 'Collect ' + item.name + ' for ' + item.cost + ' Petal Points');
  });
}
function updateGardenPetalBalance() {
  const balance = document.querySelector('.sg-petal-balance b');
  if (balance) balance.textContent = petalRewardBalance().toLocaleString() + ' Petal Points';
  const profileBalance = $('#friendProfilePetals');
  if (profileBalance && $('#friendProfileGate')?.dataset.ownProfile === 'true') profileBalance.textContent = petalRewardBalance().toLocaleString();
}
async function buyGardenCollectible(id) {
  const item = GARDEN_COLLECTIBLES.find(entry => entry.id === id);
  if (!item || !me || gardenPurchaseInFlight) return;
  if (!sb) {
    toast('The garden shop is temporarily unavailable. Please sign in again.');
    return;
  }

  gardenPurchaseInFlight = true;
  const buttons = [...document.querySelectorAll('[data-buy-collectible]')];
  buttons.forEach(button => {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
  });

  try {
    // Finish hydration and flush locally earned points before the database transaction.
    await gardenCollectionHydration;
    await hydrateGardenCollectionFromCloud();
    if (!await syncPetalPointsToCloud()) {
      throw new Error('Your Petal Points could not be synchronized. Please try again.');
    }

    const current = normalizeGardenCollection(readGardenCollection());
    const action = current.owned.includes(id) ? 'toggle_equip' : 'purchase';
    const { data, error } = await sb.rpc('perform_garden_shop_action', {
      p_item_id: id,
      p_action: action
    });
    if (error) throw error;
    if (!data || data.ok !== true || !Array.isArray(data.owned) || !Array.isArray(data.equipped_items)) {
      throw new Error('The shop returned an incomplete update. Please refresh and check your collection.');
    }

    // The RPC is the single source of truth: ownership, equipment and balance
    // are committed together under a row lock, so rapid requests cannot double-spend.
    const normalized = normalizeGardenCollection({
      owned: data.owned,
      equipped_items: data.equipped_items,
      equipped: data.equipped || 'none',
      bunny: data.bunny || 'none'
    });
    cloudPetalPoints = Math.max(0, Number(data.petal_points) || 0);
    try {
      localStorage.setItem(streakStorageKey('garden-collection'), JSON.stringify(normalized));
      localStorage.setItem(streakStorageKey('garden-collection-reconciled'), '1');
      localStorage.removeItem(streakStorageKey('garden-collection-pending-sync'));
    } catch {}

    updateGardenShopItem(id, normalized);
    updateGardenPetalBalance();

    if (data.status === 'already_owned') {
      toast(item.name + ' is already in your collection.');
    } else if (action === 'purchase') {
      toast(item.name + ' purchased and equipped!');
    } else {
      toast(normalized.equippedItems.includes(id) ? item.name + ' equipped!' : item.name + ' unequipped.');
    }
  } catch (error) {
    console.error('Garden shop action failed:', error?.message || error);
    toast(error?.message || 'The shop could not complete that action. Please try again.');
  } finally {
    gardenPurchaseInFlight = false;
    document.querySelectorAll('[data-buy-collectible]').forEach(button => {
      button.removeAttribute('aria-busy');
      const item = GARDEN_COLLECTIBLES.find(entry => entry.id === button.dataset.buyCollectible);
      const owned = readGardenCollection().owned.includes(button.dataset.buyCollectible);
      if (item) button.disabled = !owned && petalRewardBalance() < item.cost;
    });
    updateGardenPetalBalance();
  }
}
function getWeeklyBloomProgress(todayKey) {
  const date = new Date(todayKey + 'T00:00:00.000Z');
  const monday = shiftStreakDate(todayKey, -((date.getUTCDay() + 6) % 7));
  const completedDays = [];
  for (let i=0;i<7;i++) {
    const key = shiftStreakDate(monday, i);
    if (key > todayKey) continue;
    const state = readStreakDailyQuests(key);
    if (state.badge || getDailyQuestRotation(key).every(quest => quest.done(state))) completedDays.push(key);
  }
  return { monday, completedDays };
}
function claimWeeklyBloomReward(days, todayKey) {
  const progress = getWeeklyBloomProgress(todayKey);
  if (progress.completedDays.length < days) { toast('Complete ' + days + ' daily quest sets to unlock this weekly bloom.'); return; }
  const rewardKey = 'weekly:' + progress.monday + ':' + days;
  if (awardPetalReward(rewardKey, days === 3 ? 30 : days === 5 ? 50 : 100)) toast('Weekly Bloom reward collected! ✿');
  else toast('This weekly reward has already been collected.');
  renderStreakPage();
}
function claimDailyPetalChest() {
  if (!me) return;
  const dateKey = streakDateInTimeZone(normalizeStreakTimeZone(me.streak_timezone || getBrowserStreakTimeZone()));
  const state = readStreakDailyQuests(dateKey);
  if (!getDailyQuestRotation(dateKey).every(quest => quest.done(state))) {
    toast('Complete all three daily quests to open your reward chest.');
    return;
  }
  if (awardPetalReward('chest:' + dateKey, 25)) toast('Your daily chest opened! +25 Petal Points ✿');
  else toast('Today’s reward chest has already been claimed.');
  if (page === 'streak') renderStreakPage();
}
function recordStreakNoteQuest(text) {
  const content = String(text || '');
  if (!content.trim()) return;
  recordStreakDailyQuest('note', content);
  if (/💋|😘|😗|😙|😚|😽/u.test(content)) recordStreakDailyQuest('kiss-note', content);
}

function recordStreakDailyQuest(kind, value = '') {
  if (!me) return;
  const timezone = normalizeStreakTimeZone(me.streak_timezone || getBrowserStreakTimeZone());
  const dateKey = streakDateInTimeZone(timezone);
  const state = readStreakDailyQuests(dateKey);
  if (kind === 'heart' && value && !state.hearts.includes(String(value))) state.hearts.push(String(value));
  if (kind === 'photo') { state.photo = true; state.photoCount = Math.min(99,state.photoCount + 1); }
  if (kind === 'kiss-note') { state.kissNote = true; state.kissNotes = Math.min(99,state.kissNotes + 1); if (value) state.noteTexts.push(String(value)); }
  if (kind === 'note') { state.note = Math.min(99,state.note + 1); if (value) state.noteTexts.push(String(value)); }
  if (kind === 'song') { state.song = true; state.songCount = Math.min(99,state.songCount + 1); }
  if (kind === 'login') state.login = true;
  state.noteTexts = state.noteTexts.slice(-80);
  const quests = getDailyQuestRotation(dateKey);
  const newlyCompleted = !state.badge && quests.every(quest => quest.done(state));
  if (newlyCompleted) state.badge = true;
  writeStreakDailyQuests(dateKey, state);
  quests.forEach(quest => {
    if (quest.done(state)) awardPetalReward('quest:' + dateKey + ':' + quest.id, 10);
  });
  if (newlyCompleted) toast('Daily Bloom earned! You completed today’s three quests ♡');
  if (page === 'streak') renderStreakPage();
}
function streakDateKey(date) {
  return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + String(date.getUTCDate()).padStart(2, '0');
}
function shiftStreakDate(key, amount) {
  const date = new Date(key + 'T00:00:00.000Z');
  if (Number.isNaN(date.getTime())) return key;
  date.setUTCDate(date.getUTCDate() + amount);
  return streakDateKey(date);
}
function streakDateDistance(from, to) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(from || '') || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(to || '')) return null;
  const fromTime = Date.parse(from + 'T00:00:00.000Z');
  const toTime = Date.parse(to + 'T00:00:00.000Z');
  return Number.isFinite(fromTime) && Number.isFinite(toTime) ? Math.round((toTime - fromTime) / 86400000) : null;
}
function getBrowserStreakTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}
function normalizeStreakTimeZone(value) {
  const candidate = String(value || 'UTC').trim() || 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch { return 'UTC'; }
}
function streakDateInTimeZone(timeZone = 'UTC') {
  const zone = normalizeStreakTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return fields.year + '-' + fields.month + '-' + fields.day;
}
function streakTimeRemaining(timeZone = 'UTC') {
  const zone = normalizeStreakTimeZone(timeZone);
  const today = streakDateInTimeZone(zone);
  const [year, month, day] = shiftStreakDate(today, 1).split('-').map(Number);
  const targetWallTime = Date.UTC(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  let midnight = targetWallTime;
  for (let pass = 0; pass < 4; pass++) {
    const fields = Object.fromEntries(formatter.formatToParts(new Date(midnight)).map(part => [part.type, part.value]));
    const wallTime = Date.UTC(
      Number(fields.year), Number(fields.month) - 1, Number(fields.day),
      Number(fields.hour), Number(fields.minute), Number(fields.second)
    );
    const correction = targetWallTime - wallTime;
    midnight += correction;
    if (correction === 0) break;
  }
  const minutes = Math.max(0, Math.ceil((midnight - Date.now()) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? hours + 'h ' + String(rest).padStart(2, '0') + 'm' : rest + 'm';
}
function updateStreakCountdownLabels() {
  const timezone = normalizeStreakTimeZone(me?.streak_timezone || getBrowserStreakTimeZone());
  const todayKey = streakDateInTimeZone(timezone);
  if (streakCountdownDayKey && todayKey !== streakCountdownDayKey) {
    streakCountdownDayKey = todayKey;
    void recordLoginStreak();
    recordStreakDailyQuest('login');
    if (page === 'streak') renderStreakPage();
  }
  const remaining = streakTimeRemaining(timezone);
  document.querySelectorAll('[data-streak-self-countdown]').forEach(node => { node.textContent = remaining; });
  document.querySelectorAll('[data-streak-friend-countdown]').forEach(node => { node.textContent = 'Visit today · ' + remaining + ' left'; });

  document.querySelectorAll('[data-streak-friend-status]').forEach(node => {
    const friend = {
      login_streak: Number(node.dataset.streakCount) || 0,
      last_login_date: node.dataset.lastLoginDate || null,
      streak_timezone: node.dataset.streakTimezone || 'UTC'
    };
    const snapshot = streakFriendSnapshot(friend);
    node.textContent = snapshot.label;
    const card = node.closest('.sg-friend-card');
    const countNode = card?.querySelector('[data-streak-friend-count]');
    if (countNode) countNode.textContent = snapshot.count === null ? '–' : String(snapshot.count);
    const countWrap = countNode?.closest('.sg-friend-flower-count');
    if (countWrap) countWrap.setAttribute('aria-label', snapshot.count === null ? 'Streak unavailable' : snapshot.count + (snapshot.count === 1 ? ' day streak' : ' days streak'));
  });
}
function startStreakCountdown() {
  streakCountdownDayKey = streakDateInTimeZone(me?.streak_timezone || getBrowserStreakTimeZone());
  updateStreakCountdownLabels();
  if (!streakCountdownInterval) streakCountdownInterval = window.setInterval(updateStreakCountdownLabels, 60000);
}
function readStreakPetalBest() {
  try {
    const value = Number(localStorage.getItem(streakStorageKey('petal-pairs-best')));
    return Number.isInteger(value) && value > 0 ? value : 0;
  } catch { return 0; }
}
function saveStreakPetalBest(moves) {
  const current = readStreakPetalBest();
  if (!Number.isInteger(moves) || moves < 1 || (current && current <= moves)) return current;
  try { localStorage.setItem(streakStorageKey('petal-pairs-best'), String(moves)); } catch {}
  return moves;
}
function readStreakHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('history')) || '[]');
    return new Set(Array.isArray(saved) ? saved.filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)) : []);
  } catch { return new Set(); }
}
function readStreakGardenBlooms(dateKey) {
  const valid = new Set(['pink','lavender','honey','rose','peach','lilac','cream']);
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('garden-blooms:' + dateKey)) || '[]');
    return new Set(Array.isArray(saved) ? saved.filter(id => valid.has(id)) : []);
  } catch { return new Set(); }
}
function saveStreakGardenBloom(dateKey, flowerId) {
  const valid = new Set(['pink','lavender','honey','rose','peach','lilac','cream']);
  if (!valid.has(flowerId)) return new Set();
  const blooms = readStreakGardenBlooms(dateKey);
  blooms.add(flowerId);
  try { localStorage.setItem(streakStorageKey('garden-blooms:' + dateKey), JSON.stringify([...blooms])); } catch {}
  return blooms;
}
function saveStreakHistory(dateKey, count) {
  const history = readStreakHistory();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || '')) return;
  history.add(dateKey);
  for (let i = 1; i < Math.min(730, Math.max(1, Number(count) || 1)); i++) {
    history.add(shiftStreakDate(dateKey, -i));
  }
  try {
    localStorage.setItem(streakStorageKey('history'), JSON.stringify([...history].sort().slice(-1095)));
  } catch {}
}
function readStreakGoals() {
  const defaults = [
    {id:'memory', label:'Share a happy memory'},
    {id:'note', label:'Send a little love note'},
    {id:'music', label:'Enjoy a cozy song'}
  ];
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('goals')) || 'null');
    if (Array.isArray(saved)) return saved.filter(goal => goal && goal.id && goal.label).slice(0, 6);
  } catch {}
  try { localStorage.setItem(streakStorageKey('goals'), JSON.stringify(defaults)); } catch {}
  return defaults;
}
function writeStreakGoals(goals) {
  try { localStorage.setItem(streakStorageKey('goals'), JSON.stringify(goals.slice(0, 6))); } catch {}
}
function readStreakGoalChecks(dateKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('checks:' + dateKey)) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch { return {}; }
}
function countSavedStreakGoalCompletions() {
  const prefix = streakStorageKey('checks:');
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        total += Object.values(saved).filter(value => value === true).length;
      }
    }
  } catch {}
  return total;
}
function updateStreakGoalProgress() {
  const list = $('#streakGoalsList');
  if (!list) return;
  const checks = readStreakGoalChecks(new Date().toISOString().slice(0, 10));
  const boxes = [...list.querySelectorAll('[data-streak-goal]')];
  const completed = boxes.filter(box => !!checks[box.dataset.streakGoal]).length;
  const percentage = boxes.length ? Math.round(completed / boxes.length * 100) : 0;
  const label = $('#streakGoalProgress');
  const bar = $('#streakGoalProgressBar');
  if (label) label.textContent = completed + ' of ' + boxes.length + ' bloomed';
  if (bar) {
    bar.style.width = percentage + '%';
    bar.setAttribute('aria-valuenow', String(percentage));
  }
  boxes.forEach(box => box.closest('.streak-goal')?.classList.toggle('is-done', !!checks[box.dataset.streakGoal]));
  const total = countSavedStreakGoalCompletions();
  const totalLabel = $('#sgAllTimeGoalCount');
  if (totalLabel) {
    totalLabel.hidden = total === 0;
    totalLabel.textContent = total + ' little ' + (total === 1 ? 'goal' : 'goals') + ' completed across your journal';
  }
}
function readStreakMilestones() {
  try {
    const saved = JSON.parse(localStorage.getItem(streakStorageKey('milestones')) || '[]');
    return new Set(Array.isArray(saved) ? saved.map(Number) : []);
  } catch { return new Set(); }
}
function saveStreakMilestones(count) {
  const earned = readStreakMilestones();
  [3, 7, 14, 30, 50, 100, 180, 365].forEach(value => { if (count >= value) earned.add(value); });
  try { localStorage.setItem(streakStorageKey('milestones'), JSON.stringify([...earned].sort((a,b) => a-b))); } catch {}
}
function resetStreakPetalGame() {
  const symbols = ['🌷','🌼','🌸','🌻','🌺','🍀'];
  const tones = ['rose','sunshine','lilac','gold','peach','mint'];
  const flowerPairs = symbols.map((symbol, index) => {
    const firstTone = tones[Math.floor(Math.random() * tones.length)];
    const otherTones = tones.filter(tone => tone !== firstTone);
    const secondTone = otherTones[Math.floor(Math.random() * otherTones.length)];
    const pairKey = String(index);
    return [
      { id: pairKey + '-a', pairKey, symbol, tone: firstTone },
      { id: pairKey + '-b', pairKey, symbol, tone: secondTone }
    ];
  });
  const cards = flowerPairs.flat();
  for (let index = cards.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  for (let index = cards.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  streakPetalGame = { cards, flipped: [], matched: [], moves: 0, locked: false, completed: false, newBest: false };
  renderStreakPetalGame();
}
function renderStreakPetalGame() {
  const board = $('#streakGameBoard');
  if (!board) return;
  const state = streakPetalGame;
  board.innerHTML = state.cards.map(card => {
    const matched = state.matched.includes(card.id);
    const revealed = matched || state.flipped.includes(card.id);
    const petalTone = card.tone || 'rose';
    return '<button type="button" class="sg-petal-card sg-petal-' + petalTone + (revealed ? ' is-revealed' : '') +
      (matched ? ' is-matched' : '') + (state.completed ? ' is-celebrating' : '') + '" data-streak-game-card="' + card.id +
      '" aria-pressed="' + revealed + '" aria-label="' + (revealed ? card.symbol : 'Reveal a flower') +
      '"' + (matched || state.locked || state.completed ? ' disabled' : '') + '>' +
      '<span class="sg-petal-back" aria-hidden="true">✿</span><span class="sg-petal-face" aria-hidden="true">' +
      card.symbol + '</span></button>';
  }).join('');
  const pairs = state.matched.length / 2;
  const status = $('#streakGameStatus');
  const moves = $('#streakGamePairsLeft');
  if (status) status.textContent = state.completed
    ? (state.newBest ? 'New personal best! ✿' : 'All six pairs found!')
    : state.locked ? 'Remember the flowers…' : 'Find all six pairs';
  if (moves) moves.textContent = state.completed ? 'All pairs found' : (6 - pairs) + ' pairs left';
  const progress = $('#streakGameProgressBar');
  if (progress) {
    progress.style.width = (pairs / 6 * 100) + '%';
    progress.setAttribute('aria-valuenow', String(pairs));
  }
  const best = $('#streakGameBest');
  if (best) best.textContent = readStreakPetalBest() ? 'Best ' + readStreakPetalBest() : 'No best yet';
}
function flipStreakPetalCard(cardId) {
  const state = streakPetalGame;
  if (state.locked || state.completed || state.matched.includes(cardId) || state.flipped.includes(cardId)) return;

  state.flipped.push(cardId);
  if (state.flipped.length === 2) {
    state.moves += 1;
    const [firstId,secondId] = state.flipped;
    const first = state.cards.find(card => card.id === firstId);
    const second = state.cards.find(card => card.id === secondId);
    if (first && second && first.pairKey === second.pairKey) {

      state.matched.push(firstId,secondId);
      state.flipped = [];
      state.completed = state.matched.length === state.cards.length;
      if (state.completed) {
        const previousBest = readStreakPetalBest();
        saveStreakPetalBest(state.moves);
        state.newBest = !previousBest || state.moves < previousBest;
      }
      renderStreakPetalGame();
      if (state.completed) {
        window.setTimeout(() => {
          if (streakPetalGame === state) resetStreakPetalGame();
        }, 1500);
      }
      return;
    }
    state.locked = true;
    renderStreakPetalGame();
    setTimeout(() => {
      if (streakPetalGame !== state) return;
      state.flipped = [];
      state.locked = false;
      if (page === 'streak') renderStreakPetalGame();
    }, 720);
    return;
  }
  renderStreakPetalGame();
}
function streakFriendSnapshot(friend) {
  if (!Object.prototype.hasOwnProperty.call(friend || {}, 'last_login_date')) {
    return { count: null, label: 'Streak unavailable', state: 'unknown' };
  }
  const count = Math.max(0, Number(friend.login_streak) || 0);
  const lastDate = String(friend.last_login_date || '').slice(0, 10);
  if (!lastDate) {
    return {
      count,
      label: count > 0 ? 'Streak date unavailable' : 'No streak yet',
      state: count > 0 ? 'unknown' : 'new'
    };
  }
  const timezone = normalizeStreakTimeZone(friend.streak_timezone || 'UTC');
  const todayKey = streakDateInTimeZone(timezone);
  const gap = streakDateDistance(lastDate, todayKey);
  if (gap === null || gap < 0) return { count, label: 'Activity unavailable', state: 'unknown' };
  if (gap > 1) return { count: 0, label: 'Streak paused', state: 'paused' };
  if (gap === 1) return { count, label: 'Visit today · ' + streakTimeRemaining(timezone) + ' left', state: 'due' };
  return { count, label: '', state: 'active' };
}
function streakFriendsMarkup() {
  if (!Array.isArray(friends) || !friends.length) {
    return '<div class="sg-friends-empty"><p>No friends in bloom yet.</p><button type="button" class="sg-find-friends" data-go="friends">Find friends</button></div>';
  }
  let liveState = {};
  try { liveState = presenceChannel?.presenceState?.() || {}; } catch {}
  const isOnline = id => isPresenceUserOnline(id, liveState);
  const stateRank = {active:0,due:1,paused:2,new:3,unknown:4};
  const orderedFriends = [...friends].sort((a,b) => {
    const onlineOrder = Number(isOnline(b.id)) - Number(isOnline(a.id));
    if (onlineOrder) return onlineOrder;
    const aSnapshot = streakFriendSnapshot(a);
    const bSnapshot = streakFriendSnapshot(b);
    return (stateRank[aSnapshot.state] ?? 4) - (stateRank[bSnapshot.state] ?? 4) ||
      (Number(b.login_streak) || 0) - (Number(a.login_streak) || 0) ||
      String(a.username || '').localeCompare(String(b.username || ''));
  });
  const rows = orderedFriends.map(friend => {
    const snapshot = streakFriendSnapshot(friend);
    const streakDays = snapshot.count === null ? '–' : String(snapshot.count);
    const streakAria = snapshot.count === null ? 'Streak unavailable' : snapshot.count + (snapshot.count === 1 ? ' day streak' : ' days streak');
    const displayName = String(friend.display_name || friend.username || 'Friend').trim() || 'Friend';
    const timezone = normalizeStreakTimeZone(friend.streak_timezone || 'UTC');
    const lastDate = String(friend.last_login_date || '').slice(0, 10);
    const rawCount = Math.max(0, Number(friend.login_streak) || 0);
    const initialPresence = presenceStatus === 'ready' ? 'Offline' : presenceStatus === 'error' ? 'Presence unavailable' : 'Connecting…';
    return '<div class="sg-friend-card" data-friend-id="' + esc(friend.id || '') + '" aria-label="' + esc(displayName) + ' garden">' +
      '<span class="sg-friend-avatar" aria-hidden="true">' + esc(friend.mascot || '🐰') + '</span>' +
      '<span class="sg-friend-details">' +
      '<span class="sg-friend-heading"><strong class="sg-friend-name">' + esc(displayName) + '</strong>' +
      '<span class="sg-friend-flower-count" aria-label="' + esc(streakAria) + '">' +
      '<strong data-streak-friend-count>' + streakDays + '</strong><i aria-hidden="true">🌸</i><em>streak</em></span></span>' +
      '<span class="sg-friend-meta"><small class="sg-friend-presence">' + initialPresence + '</small>' +
      '<small class="sg-friend-streak-status" data-streak-friend-status data-streak-timezone="' + esc(timezone) +
      '" data-last-login-date="' + esc(lastDate) + '" data-streak-count="' + rawCount + '">' + esc(snapshot.label) + '</small></span></span></div>';
  }).join('');
  return '<div class="sg-friend-list" aria-label="' + friends.length + ' followed friends">' + rows + '</div>';
}


const STREAK_MILESTONE_ILLUSTRATIONS = [
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 79V44" stroke="#789b76" stroke-width="4" stroke-linecap="round"/><path d="M50 61C29 39 18 51 25 62c8 10 18 5 25-1Z" fill="#a9c49d"/><path d="M50 53C69 31 82 42 75 54c-7 9-17 5-25-1Z" fill="#789e79"/><path d="M50 44C39 29 43 17 50 11c9 9 11 21 0 33Z" fill="#9db98d"/><path d="M50 79H26M50 79h25" stroke="#c49a76" stroke-width="3" stroke-linecap="round"/></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 79V44" stroke="#789b76" stroke-width="4" stroke-linecap="round"/><path d="M49 64c-16-13-24-4-18 4 6 6 12 2 18-4Z" fill="#9db98d"/><g fill="#e8a2bc"><ellipse cx="50" cy="23" rx="8" ry="16"/><ellipse cx="50" cy="23" rx="8" ry="16" transform="rotate(60 50 23)"/><ellipse cx="50" cy="23" rx="8" ry="16" transform="rotate(120 50 23)"/></g><circle cx="50" cy="23" r="8" fill="#f4d17f"/><path d="M50 79H28h44" stroke="#c49a76" stroke-width="3" stroke-linecap="round"/></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M12 76c20-12 53-12 76 0" fill="#d9e6cd"/><path d="M21 76V48m0 13c-13-14-19-5-13 3 5 5 10 2 13-3Zm0-10c11-12 18-6 13 2-4 5-9 3-13-2Z" fill="#91ad83"/><path d="M49 76V38m0 24c-18-16-24-5-17 4 6 5 12 2 17-4Zm0-13c15-18 24-7 17 2-6 7-12 4-17-2Z" fill="#789d78"/><path d="M77 76V50m0 13c-12-12-18-4-12 3 5 4 9 2 12-3Z" fill="#a8bd8d"/><circle cx="21" cy="45" r="6" fill="#e7a4bd"/><circle cx="49" cy="34" r="7" fill="#d9b6e2"/><circle cx="77" cy="46" r="6" fill="#edc77d"/></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 79V37" stroke="#789b76" stroke-width="4" stroke-linecap="round"/><path d="M50 65C27 41 19 56 29 66c7 7 14 3 21-1Zm0-14c20-24 31-9 21 1-7 7-14 3-21-1Z" fill="#85a47d"/><g fill="#e7a2bd"><circle cx="50" cy="25" r="13"/><circle cx="37" cy="29" r="10"/><circle cx="63" cy="29" r="10"/><circle cx="50" cy="13" r="10"/></g><circle cx="50" cy="25" r="6" fill="#f4d17f"/></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 79 28 37m22 42 22-42M50 79V27" stroke="#7b9b75" stroke-width="3.5" stroke-linecap="round"/><path d="M39 58c-18-13-23-1-14 7 6 4 11 0 14-7Zm22 0c18-13 23-1 14 7-6 4-11 0-14-7Z" fill="#9db98d"/><g fill="#e9a7bf"><circle cx="28" cy="31" r="9"/><circle cx="22" cy="24" r="7"/><circle cx="34" cy="24" r="7"/></g><g fill="#d7b4e4"><circle cx="72" cy="31" r="9"/><circle cx="66" cy="24" r="7"/><circle cx="78" cy="24" r="7"/></g><g fill="#e4bd72"><circle cx="50" cy="20" r="10"/><circle cx="43" cy="13" r="7"/><circle cx="57" cy="13" r="7"/></g><circle cx="28" cy="31" r="3" fill="#f2d17d"/><circle cx="72" cy="31" r="3" fill="#f2d17d"/></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M10 76c18-20 62-20 80 0" fill="#dce8d1"/><path d="M25 76V42m0 15c-15-14-22-3-14 6 5 5 10 2 14-6Zm0-12c12-16 21-7 14 1-5 6-10 5-14-1Z" fill="#789c77"/><path d="M50 76V27m0 35c-21-20-30-6-19 4 7 6 14 2 19-4Zm0-17c18-20 29-8 18 2-7 6-13 4-18-2Z" fill="#8eae82"/><path d="M76 76V44m0 15c-15-14-21-4-14 4 5 5 10 2 14-4Z" fill="#a5bd91"/><g fill="#e8a1bb"><circle cx="25" cy="37" r="7"/><circle cx="50" cy="22" r="9"/><circle cx="76" cy="39" r="7"/></g><g fill="#f1d17f"><circle cx="25" cy="37" r="3"/><circle cx="50" cy="22" r="4"/><circle cx="76" cy="39" r="3"/></g></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 78V39" stroke="#789b76" stroke-width="4" stroke-linecap="round"/><path d="M50 62C26 43 20 57 30 67c7 6 14 1 20-5Zm0-12c19-24 31-9 21 1-7 7-14 3-21-1Z" fill="#789e79"/><g fill="#dcb7e7"><circle cx="50" cy="24" r="11"/><circle cx="37" cy="26" r="8"/><circle cx="63" cy="26" r="8"/><circle cx="50" cy="11" r="8"/></g><circle cx="50" cy="24" r="5" fill="#f4d17f"/><path d="M15 20 18 9l3 11 10 3-10 3-3 10-3-10-10-3Z" fill="#e8c77d"/><path d="m82 13 2-7 2 7 7 2-7 2-2 7-2-7-7-2Z" fill="#dcb7e7"/><circle cx="25" cy="66" r="3" fill="#edc77d"/><circle cx="80" cy="57" r="4" fill="#e7a2bd"/></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 80V40" stroke="#688b6c" stroke-width="5" stroke-linecap="round"/><path d="M50 67C22 48 17 63 29 73c8 6 15 1 21-6Zm0-14c23-25 37-8 24 4-8 7-16 2-24-4Z" fill="#83a47a"/><path d="M50 45C26 24 33 8 50 3c18 8 26 26 0 42Z" fill="#87a978"/><g fill="#e9a4bd"><circle cx="37" cy="22" r="8"/><circle cx="63" cy="24" r="9"/><circle cx="49" cy="11" r="9"/><circle cx="50" cy="34" r="9"/></g><g fill="#f1d17f"><circle cx="37" cy="22" r="3"/><circle cx="63" cy="24" r="3"/><circle cx="49" cy="11" r="3"/><circle cx="50" cy="34" r="3"/></g><path d="M20 80h60" stroke="#bd9a74" stroke-width="3" stroke-linecap="round"/></svg>'
  ];

async function loadKindnessEventStatus() {
 if(!sb||!me?.id||kindnessEventStatusLoading)return kindnessEventStatus;
 const userId=String(me.id);kindnessEventStatusLoading=true;
 try{
  const {data,error}=await sb.rpc('get_kindness_event_status');if(error)throw error;
  if(String(me?.id||'')!==userId)return null;
  kindnessEventStatus=data&&typeof data==='object'?data:null;kindnessEventStatusUserId=userId;
  const {data:garden,error:gardenError}=await sb.from('profile_garden_collections').select('petal_points').eq('user_id',userId).maybeSingle();
  if(!gardenError&&String(me?.id||'')===userId&&garden)cloudPetalPoints=Math.max(0,Number(garden.petal_points)||0);
  if(page==='streak')renderStreakPage();else if(page==='home')render();
  return kindnessEventStatus;
 }catch(error){console.warn('Kindness event status could not be loaded:',error?.message||error);return null;}
 finally{kindnessEventStatusLoading=false;}
}
async function claimKindnessEventReward() {
  if (!sb || !me?.id || kindnessClaimInFlight) return;
  const button = $('[data-claim-kindness-event]');
  if (button) button.disabled = true;
  kindnessClaimInFlight = true;
  try {
    const { data, error } = await sb.rpc('claim_kindness_event_reward');
    if (error) throw error;
    await hydrateGardenCollectionFromCloud();
    gardenCollectionReadyUserId = String(me.id);
    kindnessEventStatus = { ...(kindnessEventStatus || {}), state: 'claimed', bubble_count: Number(data?.petal_points) || Number(kindnessEventStatus?.bubble_count) || 0 };
    kindnessEventStatusUserId = String(me.id);
    if (page === 'streak') renderStreakPage();
    else if (page === 'home') render();
    toast('Your ' + (Number(data?.petal_points) || 0) + ' Petal Points have been added ♡');
  } catch (error) {
    toast(error?.message || 'Your kindness reward could not be claimed. Please try again.');
    void loadKindnessEventStatus();
  } finally {
    kindnessClaimInFlight = false;
    if (button) button.disabled = false;
  }
}

function renderKindnessEventMarkup() {
 const status=kindnessEventStatusUserId===String(me?.id||'')?kindnessEventStatus:null;
 if(!status||status.show_poster!==true)return '';
 const friendTimes=(Array.isArray(friends)?friends:[]).filter(friend=>friend&&friend.id&&friend.streak_timezone).slice(0,6).map(friend=>'<span class="sg-kindness-friend-time"><b>'+esc(friend.displayName||friend.display_name||friend.username||'Friend')+'</b><small>11:00 PM · '+esc(friend.streak_timezone)+'</small></span>').join('');
 const active=status.state==='active',count=Math.max(0,Number(status.bubble_count)||0);
 const timeZone=status.timezone||'Local timezone';
 const detail=active?count+' petals collected so far. Completed petals are added to your permanent balance after midnight.':'Your next kindness hour begins at 11 PM in your local timezone.';
 return '<section class="sg-kindness-event" aria-label="Kindness Hour">'+
 '<div class="sg-kindness-event-sparkle sg-kindness-sparkle-one" aria-hidden="true">✦</div><div class="sg-kindness-event-sparkle sg-kindness-sparkle-two" aria-hidden="true">✧</div>'+
 '<div class="sg-kindness-event-heading"><span class="sg-kindness-heart" aria-hidden="true">♡</span><div class="sg-kindness-title-wrap"><span class="sg-kindness-eyebrow">SUNDAY &amp; WEDNESDAY</span><h3>Kindness Hour</h3><span class="sg-kindness-subtitle">A little love goes a long way</span></div><span class="sg-kindness-phase'+(active?' is-live':'')+'">'+(active?'LIVE NOW':'NEXT SESSION')+'</span></div>'+
 '<div class="sg-kindness-timebar"><span class="sg-kindness-clock" aria-hidden="true">◷</span><span class="sg-kindness-time-label">YOUR LOCAL TIME</span><strong>11:00 PM – 12:00 AM</strong><span class="sg-kindness-timezone">'+esc(timeZone)+'</span></div>'+(friendTimes?'<div class="sg-kindness-friend-times"><span>FRIENDS’ LOCAL SCHEDULES</span>'+friendTimes+'</div>':'')+'<div class="sg-kindness-event-body"><div class="sg-kindness-copy"><p>Every chat bubble you send or receive during the hour earns <strong>1 Petal Point</strong>.</p><small>'+esc(detail)+'</small></div><div class="sg-kindness-reward"><span class="sg-kindness-petal-count">'+count+'</span><span class="sg-kindness-petal-label">PETALS THIS HOUR</span><span class="sg-kindness-state">'+(active?'Collecting…':'See you tonight ♡')+'</span></div></div></section>';
}
function renderStreakPage() {
  const content = $('#content');
  if (!content || !me) return;
  const collectionUserId = String(me.id);
  if (gardenCollectionHydratedUserId !== collectionUserId) {
    gardenCollectionHydratedUserId = collectionUserId;
    gardenCollectionReadyUserId = '';
    gardenCollectionHydration = hydrateGardenCollectionFromCloud().then(() => {
      gardenCollectionReadyUserId = collectionUserId;
      if (page === 'streak') renderStreakPage();
    });
  }
  // Never render shop prices from a stale local cache while cloud ownership is loading.
  if (gardenCollectionReadyUserId !== collectionUserId) {
    content.innerHTML = '<div class="streak-garden-page"><p class="sg-petal-note">Loading your garden collection…</p></div>';
    return;
  }
  const timezone = normalizeStreakTimeZone(me.streak_timezone || getBrowserStreakTimeZone());
  const todayKey = streakDateInTimeZone(timezone);
  const lastDate = String(me.last_login_date || '').slice(0, 10);
  const gap = lastDate ? streakDateDistance(lastDate, todayKey) : null;
  const count = gap !== null && gap >= 0 && gap <= 1 ? Math.max(0, Number(me.login_streak) || 0) : 0;
  if (count) {
    saveStreakHistory(lastDate, count);
    saveStreakMilestones(count);
  }
  const history = readStreakHistory();
  const gardenBlooms = readStreakGardenBlooms(todayKey);
  const sortedHistory = [...history].sort();
  let bestRun = 0, run = 0, previous = '';
  sortedHistory.forEach(day => {
    run = previous && shiftStreakDate(previous, 1) === day ? run + 1 : 1;
    bestRun = Math.max(bestRun, run);
    previous = day;
  });

  const gardenStage = count >= 30 ? 'Your garden is in full bloom' : count >= 14 ? 'Your flowers are thriving' :
    count >= 7 ? 'Your garden is blooming' : count ? 'Your garden is growing' : 'Your first bloom is waiting';

  const milestones = [
    {days:3, icon:'🌱', name:'Tiny sprout'},
    {days:7, icon:'🌼', name:'First flower'},
    {days:14, icon:'🌷', name:'Little garden'},
    {days:30, icon:'🌸', name:'Growing plant'},
    {days:50, icon:'💐', name:'Golden bouquet'},
    {days:100, icon:'🌟', name:'Blooming garden'},
    {days:180, icon:'🏵️', name:'Magical garden'},
    {days:365, icon:'💮', name:'Eternal garden'}
  ];
  const earned = readStreakMilestones();
  const next = milestones.find(item => count < item.days) || null;
  const previousMilestone = next ? [...milestones].reverse().find(item => item.days <= count) : milestones[milestones.length - 1];
  const base = previousMilestone ? previousMilestone.days : 0;
  const progress = next ? Math.max(0, Math.min(100, ((count - base) / Math.max(1, next.days - base)) * 100)) : 100;
  const left = next ? Math.max(0, next.days - count) : 0;
  const allTimeGoalCompletions = countSavedStreakGoalCompletions();

  const heartCount = Math.max(0, Number(me.heartCount) || 0);
  saveStreakHeartMilestones(heartCount);
  const heartMilestones = [
    {hearts:10, name:'Little Keepsake', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M13 25 36 13l23 12v27H13Z" fill="#f5d9e4" stroke="#c98da8" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 24h52v8H10z" fill="#e8b9cb" stroke="#c98da8" stroke-width="2"/><path d="M29 23c0-8 14-8 14 0-1 5-7 8-7 8s-6-3-7-8Z" fill="#d77e9e"/><path d="M36 32v20" stroke="#c98da8" stroke-width="2"/><path d="m23 18 5-5m16 5 5-5" stroke="#fff8f4" stroke-width="2" stroke-linecap="round"/></svg>'},
    {hearts:100, name:'Sweet Letter', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><rect x="10" y="17" width="52" height="36" rx="7" fill="#fff0e8" stroke="#c98da8" stroke-width="2.2"/><path d="m12 22 24 19 24-19" fill="none" stroke="#d89bb2" stroke-width="2.5" stroke-linecap="round"/><path d="M28 13c0-6 9-7 9 0 0-7 10-6 9 0-1 5-9 10-9 10s-8-5-9-10Z" fill="#d77e9e"/><path d="M19 47h15m-15-5h9" stroke="#d8b4c2" stroke-width="2" stroke-linecap="round"/></svg>'},
    {hearts:250, name:'Blushing Bouquet', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M22 30 36 55 50 30" fill="#d9e7ce" stroke="#91aa82" stroke-width="2"/><path d="M36 53V29M36 43 24 34M36 40l12-10" stroke="#91aa82" stroke-width="2.5" stroke-linecap="round"/><g fill="#f4c5d5" stroke="#c98da8" stroke-width="1.5"><circle cx="23" cy="20" r="7"/><circle cx="36" cy="13" r="7"/><circle cx="49" cy="20" r="7"/></g><g fill="#e6a1b9"><circle cx="23" cy="20" r="2.5"/><circle cx="36" cy="13" r="2.5"/><circle cx="49" cy="20" r="2.5"/></g><path d="m22 45 14 10 14-10" fill="none" stroke="#c98da8" stroke-width="3" stroke-linecap="round"/></svg>'},
    {hearts:500, name:'Golden Treasure', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="m36 8 7 8 12-1-2 12 8 9-10 7-3 12-12-4-12 4-3-12-10-7 8-9-2-12 12 1Z" fill="#f7e8b8" stroke="#c7a45f" stroke-width="2"/><path d="m36 19 12 11-12 17-12-17Z" fill="#e8a4ba" stroke="#bd7895" stroke-width="2"/><path d="m24 30 12 4 12-4M36 34v13" fill="none" stroke="#fff4e7" stroke-width="2"/><circle cx="36" cy="28" r="3" fill="#fff5d9"/></svg>'},
    {hearts:750, name:'Love Guardian', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="m13 27 6-14 12 8 5-12 5 12 12-8 6 14-9 24H22Z" fill="#e9dff4" stroke="#a58bb8" stroke-width="2" stroke-linejoin="round"/><path d="M25 31c0-7 10-8 11 0 2-8 12-7 12 0-1 7-12 15-12 15S26 38 25 31Z" fill="#d77e9e" stroke="#bd7895" stroke-width="1.4"/><circle cx="19" cy="17" r="2" fill="#d7b56e"/><circle cx="53" cy="17" r="2" fill="#d7b56e"/><path d="M18 48q-5 5-1 9m37-9q5 5 1 9" fill="none" stroke="#a58bb8" stroke-width="2" stroke-linecap="round"/></svg>'},
    {hearts:1000, name:'Everlasting Love', art:'<svg viewBox="0 0 72 64" aria-hidden="true"><circle cx="36" cy="32" r="25" fill="#fff0e7" stroke="#d5a2b5" stroke-width="2"/><circle cx="36" cy="32" r="20" fill="none" stroke="#e6c1ce" stroke-width="1.5" stroke-dasharray="2 3"/><path d="M24 29c0-9 12-10 12 0 1-10 13-9 13 0-1 9-13 18-13 18S25 38 24 29Z" fill="#d77e9e" stroke="#bd7895" stroke-width="1.5"/><path d="m16 12 3 4 5 1-5 2-3 5-2-5-5-2 5-1Zm40-2 2 4 4 2-4 1-2 4-2-4-4-1 4-2Z" fill="#d6b66f"/><path d="M15 39q-5-5-7 0m49 0q5-5 7 0" fill="none" stroke="#91aa82" stroke-width="2" stroke-linecap="round"/></svg>'}
  ];
  const earnedHearts = readStreakHeartMilestones();
  const heartBadges = heartMilestones.map(item => {
    const unlocked = heartCount >= item.hearts;
    const percentage = unlocked ? 100 : Math.min(100, heartCount / item.hearts * 100);
    const status = unlocked ? 'Heart unlocked' : (item.hearts - heartCount) + ' hearts to go';
    return '<article class="streak-milestone sg-milestone' + (unlocked ? ' is-earned' : ' is-locked') + '">' +
      '<span class="sg-milestone-art sg-heart-milestone-art">' + item.art + '</span>' +
      '<span class="sg-milestone-copy"><small class="sg-milestone-day">' + item.hearts + ' HEARTS</small><b>' + item.name +
      '</b><em>' + status + '</em></span>' +
      '<span class="sg-milestone-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      Math.round(percentage) + '"><i style="width:' + percentage + '%"></i></span>' +
      '<small class="sg-milestone-progress-copy">' + Math.min(heartCount, item.hearts) + ' / ' + item.hearts + ' hearts</small></article>';
  }).join('');
  const dailyQuestState = readStreakDailyQuests(todayKey);
  const dailyQuestItems = getDailyQuestRotation(todayKey).map(quest => {
    const progress = Math.min(quest.target,quest.progress(dailyQuestState));
    const done = quest.done(dailyQuestState);
    return {...quest,progress,done};
  });
  const completedQuests = dailyQuestItems.filter(item => item.done).length;
  const petalRewards = readPetalRewards();
  const chestClaimed = Object.prototype.hasOwnProperty.call(petalRewards, 'chest:' + todayKey);
  const petalRewardsMarkup = '<div class="sg-petal-rewards" aria-label="Petal Points rewards">' +
    '<div class="sg-petal-balance"><span class="sg-petal-balance-art">' + gardenIllustration('bloom-5') + '</span><div><b>' + petalRewardBalance(petalRewards) + ' Petal Points</b><small>Earn 10 per daily quest · 25 from the daily chest</small></div></div>' +
    '<button type="button" class="sg-petal-chest" data-claim-petal-chest' + (completedQuests !== 3 || chestClaimed ? ' disabled' : '') + '>' +
    '<span class="sg-chest-art">' + gardenIllustration('golden-bell') + '</span> ' + (chestClaimed ? 'Chest collected today' : completedQuests === 3 ? 'Open daily chest · +25' : 'Complete 3 quests to unlock chest') + '</button>' +
    '<small class="sg-petal-note">Your Petal Points sync to your account and stay available across your devices.</small></div>';
  const collection = readGardenCollection();
  const collectibleMarkup = '<section class="sg-collectibles"><div class="sg-section-heading"><div><h3>Little Garden Shop</h3><p>Find a tiny treasure, from everyday blooms to magical keepsakes</p></div><span class="sg-shop-sparkle" aria-hidden="true">✧</span></div><div class="sg-collectible-grid">' +
    [...GARDEN_COLLECTIBLES].sort((a, b) => a.cost - b.cost).map(item => {
      const owned = collection.owned.includes(item.id);
      const equippedIds = new Set(Array.isArray(collection.equippedItems) ? collection.equippedItems : [collection.equipped, collection.bunny].filter(id => id && id !== 'none'));
      const equipped = equippedIds.has(item.id);
      const affordable = petalRewardBalance(petalRewards) >= item.cost;
      return '<article class="sg-collectible-card item-' + item.id + ' rarity-' + item.rarity + (equipped ? ' is-equipped' : '') + '" data-rarity="' + item.rarity + '"><span class="sg-collectible-art">' + item.art + '<i class="sg-art-glint" aria-hidden="true">✧</i></span><b>' + item.name + '</b><small>' + (item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)) + ' · ' + (item.type === 'bunny' ? 'Bunny style' : 'Garden decor') + '</small><button type="button" data-buy-collectible="' + item.id + '"' + (!owned && !affordable ? ' disabled' : '') + '>' + (equipped ? 'Equipped ✓' : owned ? 'Equip' : item.cost + ' petals · Collect') + '</button></article>';
    }).join('') + '</div></section>';
  const weeklyProgress = getWeeklyBloomProgress(todayKey);
  const weeklyTiers = [{days:3,points:30,title:'Little Bloom',art:gardenIllustration('bloom-3')},{days:5,points:50,title:'Garden Glow',art:gardenIllustration('bloom-5')},{days:7,points:100,title:'Full Bloom',art:gardenIllustration('bloom-7')}];
  const weeklyMarkup = '<section class="sg-weekly-rewards"><div class="sg-section-heading"><div><h3>Weekly Bloom Rewards</h3><p>Complete daily quests on different days</p></div><span class="sg-goal-count">' + weeklyProgress.completedDays.length + ' / 7 days</span></div><div class="sg-weekly-tier-list">' +
    weeklyTiers.map(tier => {
      const key = 'weekly:' + weeklyProgress.monday + ':' + tier.days;
      const claimed = Object.prototype.hasOwnProperty.call(petalRewards, key);
      const unlocked = weeklyProgress.completedDays.length >= tier.days;
      return '<article class="sg-weekly-tier' + (unlocked ? ' is-unlocked' : '') + '"><span class="sg-weekly-art">' + tier.art + '</span><div><b>' + tier.title + '</b><small>' + tier.days + ' completed days · +' + tier.points + ' petals</small></div><button type="button" data-claim-weekly="' + tier.days + '"' + (!unlocked || claimed ? ' disabled' : '') + '>' + (claimed ? 'Claimed ✓' : unlocked ? 'Collect' : 'Locked') + '</button></article>';
    }).join('') + '</div></section>';
  const dailyQuestMarkup = '<div class="sg-daily-quest-list">' +
    dailyQuestItems.map(item => {
      const action = item.kind === 'photo' ? 'gallery' : item.kind === 'song' ? 'music' :
        (item.kind === 'note' || item.kind === 'kiss-note') ? 'notes' :
        item.kind === 'heart' ? 'gallery' : 'streak';
      return '<article class="sg-daily-quest-card' + (item.done ? ' is-done' : '') + '" data-daily-quest-action="' + action + '" role="button" tabindex="0" aria-label="' + esc(item.title + '. ' + item.description + (item.done ? ' Completed.' : ' Open quest activity.')) + '">' +
        '<span class="sg-daily-quest-icon">' + gardenIllustration(item.art || item.kind || item.id) + '</span>' +
        '<div class="sg-daily-quest-copy"><div class="sg-daily-quest-title-row"><b>' + item.title + '</b>' +
        '<span class="sg-daily-quest-status' + (item.done ? ' is-done' : '') + '">' + (item.done ? 'Done ✓' : item.progress + ' / ' + item.target) + '</span></div>' +
        '<p>' + item.description + '</p><div class="sg-daily-quest-progress"><span style="width:' + (item.progress / item.target * 100) + '%"></span></div></div></article>';
    }).join('') +
    '</div><div class="sg-daily-quest-footer"><span>' + completedQuests + ' / 3 quests complete</span>' +
    (dailyQuestState.badge ? '<b class="sg-daily-bloom-badge">✿ Daily Bloom earned</b>' : '<small>Complete today’s 3 quests to earn your Daily Bloom</small>') + '</div>';

  const todayDate = new Date(todayKey + 'T00:00:00Z');
  const mondayOffset = (todayDate.getUTCDay() + 6) % 7;
  const weekStartDate = shiftStreakDate(todayKey, -mondayOffset);
  const weekEndDate = shiftStreakDate(weekStartDate, 6);
  if (!streakSelectedWeekDate || streakSelectedWeekDate < weekStartDate || streakSelectedWeekDate > weekEndDate) {
    streakSelectedWeekDate = todayKey;
  }
  const week = [];
  for (let i = 0; i < 7; i++) {
    const key = shiftStreakDate(weekStartDate, i);
    const date = new Date(key + 'T00:00:00Z');
    const shortName = new Intl.DateTimeFormat(undefined, {weekday:'short', timeZone:'UTC'}).format(date);
    const fullDate = new Intl.DateTimeFormat(undefined, {weekday:'long', month:'short', day:'numeric', timeZone:'UTC'}).format(date);
    const visited = history.has(key), isToday = key === todayKey, isFuture = key > todayKey;
    const selected = key === streakSelectedWeekDate;
    const stateClass = (visited ? ' is-visited' : isFuture ? ' is-future' : ' is-missed') + (isToday ? ' is-today' : '');
    const marker = visited
      ? '<svg viewBox="0 0 40 40"><g fill="#d989a8"><ellipse cx="20" cy="8" rx="5.2" ry="8"/><ellipse cx="20" cy="8" rx="5.2" ry="8" transform="rotate(60 20 20)"/><ellipse cx="20" cy="8" rx="5.2" ry="8" transform="rotate(120 20 20)"/><ellipse cx="20" cy="8" rx="5.2" ry="8" transform="rotate(180 20 20)"/><ellipse cx="20" cy="8" rx="5.2" ry="8" transform="rotate(240 20 20)"/><ellipse cx="20" cy="8" rx="5.2" ry="8" transform="rotate(300 20 20)"/></g><circle cx="20" cy="20" r="5" fill="#efc978"/><path d="M20 26v10" stroke="#789775" stroke-width="2" stroke-linecap="round"/></svg>'
      : isFuture
        ? '<svg viewBox="0 0 40 40"><path d="M20 35V20" stroke="#91a98b" stroke-width="2" stroke-linecap="round"/><path d="M20 27c-8-9-14-4-12 1 4 5 9 3 12-1Z" fill="#dce8d4"/><path d="M20 20c-7-7-5-15 0-17 7 5 7 12 0 17Z" fill="#f4dfe8" stroke="#cfadc1" stroke-width="1.5"/></svg>'
        : '<span class="sg-week-missed-mark" aria-hidden="true">–</span>';
    week.push('<button type="button" class="sg-week-day' + stateClass + (selected ? ' is-selected' : '') +
      '" data-streak-week-date="' + key + '" aria-pressed="' + selected + '" aria-label="' + fullDate + ': ' +
      (visited ? 'visit recorded' : isFuture ? 'upcoming day' : 'no visit recorded') + '">' +
      '<span class="sg-week-name">' + shortName + '</span><span class="sg-week-flower" aria-hidden="true">' + marker +
      '</span><small class="sg-week-date">' + Number(key.slice(-2)) + '</small></button>');
  }

  const goals = readStreakGoals();
  const checks = readStreakGoalChecks(todayKey);
  const completed = Object.keys(checks).filter(id => checks[id] && goals.some(goal => goal.id === id)).length;
  const goalMarkup = goals.map((goal, index) =>
    '<div class="streak-goal sg-goal-row' + (checks[goal.id] ? ' is-done' : '') + '">' +
    '<label class="streak-goal-main sg-goal-main"><input type="checkbox" data-streak-goal="' + esc(goal.id) + '"' +
    (checks[goal.id] ? ' checked' : '') + '><span class="sg-goal-flower" aria-hidden="true"><svg viewBox="0 0 40 40"><g fill="' +
    ['#d989a8','#b9a6d7','#dcae73','#d989a8','#a5b99b','#b9a6d7'][index % 6] +
    '"><ellipse cx="20" cy="8" rx="5" ry="8"/><ellipse cx="20" cy="8" rx="5" ry="8" transform="rotate(60 20 20)"/><ellipse cx="20" cy="8" rx="5" ry="8" transform="rotate(120 20 20)"/><ellipse cx="20" cy="8" rx="5" ry="8" transform="rotate(180 20 20)"/><ellipse cx="20" cy="8" rx="5" ry="8" transform="rotate(240 20 20)"/><ellipse cx="20" cy="8" rx="5" ry="8" transform="rotate(300 20 20)"/></g><circle cx="20" cy="20" r="5" fill="#efc978"/></svg></span><span class="sg-goal-text">' + esc(goal.label) +
    '</span></label><button type="button" class="streak-goal-remove sg-goal-remove" data-streak-remove-goal="' + esc(goal.id) +
    '" aria-label="Remove ' + esc(goal.label) + '">×</button></div>'
  ).join('') || '<div class="streak-empty-goals">Your journal is ready for a little promise. ♡</div>';

  const milestoneIllustrations = STREAK_MILESTONE_ILLUSTRATIONS;
  const badges = milestones.map((item, index) => {
    const unlocked = count >= item.days;
    const daysLeft = Math.max(0, item.days - count);
    const milestoneProgress = unlocked ? 100 : Math.min(100, Math.max(0, count / item.days * 100));
    const status = unlocked ? 'Bloom unlocked' : daysLeft === 1 ? '1 day to go' : daysLeft + ' days to go';
    return '<article class="streak-milestone sg-milestone' + (unlocked ? ' is-earned' : ' is-locked') +
      '" aria-label="' + item.name + ', ' + item.days + ' days, ' + status + '">' +
      '<span class="sg-milestone-art">' + milestoneIllustrations[index] + '</span>' +
      '<span class="sg-milestone-copy"><small class="sg-milestone-day">' + item.days + '-DAY BLOOM</small><b>' + item.name +
      '</b><em class="sg-milestone-status">' + status + '</em></span>' +
      '<span class="sg-milestone-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      Math.round(milestoneProgress) + '" aria-label="' + Math.round(milestoneProgress) + '% toward ' + item.name + '">' +
      '<i style="width:' + milestoneProgress + '%"></i></span>' +
      '<small class="sg-milestone-progress-copy">' + (unlocked ? item.days + ' days reached' : Math.min(count, item.days) + ' / ' + item.days + ' days') + '</small></article>';
  }).join('');

  const gardenScene = `<svg class="sg-garden-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 460" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="sgGardenTitle sgGardenDesc">
  <title id="sgGardenTitle">A little bunny's cherry blossom garden</title>
  <desc id="sgGardenDesc">A gentle garden with lavender mountains, sage grass, a flowering cherry tree and a small bunny gardener.</desc>
  <defs>
    <linearGradient id="sgMountainFar" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#c9badd"/>
      <stop offset="1" stop-color="#a9a1c7"/>
    </linearGradient>
    <linearGradient id="sgMountainNear" x1="0" y1="0" x2="0.9" y2="1">
      <stop stop-color="#b9b2d0"/>
      <stop offset="1" stop-color="#9998b6"/>
    </linearGradient>
    <linearGradient id="sgMeadow" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#b7c6a7"/>
      <stop offset="1" stop-color="#829d7d"/>
    </linearGradient>
    <linearGradient id="sgBunnyFur" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#fffdf4"/>
      <stop offset="1" stop-color="#eadfd7"/>
    </linearGradient>
    <linearGradient id="sgScarf" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#d995ae"/>
      <stop offset="1" stop-color="#bd7898"/>
    </linearGradient>
    <linearGradient id="sgPetal" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#fff3f4"/>
      <stop offset="1" stop-color="#e8a5bc"/>
    </linearGradient>
    <linearGradient id="sgGardenPetal" x1="0" y1="0" x2=".72" y2="1">
      <stop stop-color="#fffafd"/>
      <stop offset=".42" stop-color="#f9c4d5"/>
      <stop offset="1" stop-color="#df8eae"/>
    </linearGradient>
    <radialGradient id="sgGardenCenter" cx=".36" cy=".28" r=".8">
      <stop stop-color="#fff1ad"/>
      <stop offset=".58" stop-color="#f1c75e"/>
      <stop offset="1" stop-color="#d99a42"/>
    </radialGradient>
    <g id="sgCherryBloom">
      <g fill="url(#sgPetal)" stroke="#d58da9" stroke-opacity=".45" stroke-width="1.2">
        <ellipse cy="-8" rx="5.8" ry="10"/>
        <ellipse cy="-8" rx="5.8" ry="10" transform="rotate(72)"/>
        <ellipse cy="-8" rx="5.8" ry="10" transform="rotate(144)"/>
        <ellipse cy="-8" rx="5.8" ry="10" transform="rotate(216)"/>
        <ellipse cy="-8" rx="5.8" ry="10" transform="rotate(288)"/>
      </g>
      <circle r="3.8" fill="#e8c77f"/>
    </g>
    <g id="sgGardenFlower">
      <path d="M0 8 C-1 17 -1 26 0 35" fill="none" stroke="#668868" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M-1 24 Q-18 12 -18 24 Q-10 33 -1 24Z" fill="#87a982" stroke="#668868" stroke-opacity=".45" stroke-width=".8"/>
      <path d="M0 30 Q17 17 18 29 Q10 38 0 30Z" fill="#a8c49a" stroke="#668868" stroke-opacity=".4" stroke-width=".8"/>
      <g transform="scale(1.25)">
        <g fill="url(#sgGardenPetal)" stroke="#cc7f9e" stroke-width=".9" stroke-linejoin="round">
          <path d="M0 -1 C-4 -3 -7 -6 -6 -11 C-5 -16 -1 -18 3 -15 C7 -11 6 -5 2 -2Z"/>
          <path d="M0 -1 C-4 -3 -7 -6 -6 -11 C-5 -16 -1 -18 3 -15 C7 -11 6 -5 2 -2Z" transform="rotate(72)"/>
          <path d="M0 -1 C-4 -3 -7 -6 -6 -11 C-5 -16 -1 -18 3 -15 C7 -11 6 -5 2 -2Z" transform="rotate(144)"/>
          <path d="M0 -1 C-4 -3 -7 -6 -6 -11 C-5 -16 -1 -18 3 -15 C7 -11 6 -5 2 -2Z" transform="rotate(216)"/>
          <path d="M0 -1 C-4 -3 -7 -6 -6 -11 C-5 -16 -1 -18 3 -15 C7 -11 6 -5 2 -2Z" transform="rotate(288)"/>
        </g>
        <g fill="none" stroke="#fff8fb" stroke-width=".85" stroke-linecap="round" opacity=".9">
          <path d="M0 -4 Q-2 -9 -1 -13"/>
          <path d="M0 -4 Q-2 -9 -1 -13" transform="rotate(72)"/>
          <path d="M0 -4 Q-2 -9 -1 -13" transform="rotate(144)"/>
          <path d="M0 -4 Q-2 -9 -1 -13" transform="rotate(216)"/>
          <path d="M0 -4 Q-2 -9 -1 -13" transform="rotate(288)"/>
        </g>
        <circle r="4.2" fill="url(#sgGardenCenter)" stroke="#d49a4a" stroke-width=".65"/>
        <g stroke="#e8b548" stroke-width="1.15" stroke-linecap="round">
          <path d="M0 -2 L0 -7 M2 0 L7 -2 M2 2 L5 7 M-2 2 L-5 7 M-2 0 L-7 -2"/>
        </g>
        <g fill="#f6d879" stroke="#dba64b" stroke-width=".4">
          <circle cy="-7.2" r="1.3"/>
          <circle cx="7.2" cy="-2" r="1.3"/>
          <circle cx="5" cy="7" r="1.3"/>
          <circle cx="-5" cy="7" r="1.3"/>
          <circle cx="-7.2" cy="-2" r="1.3"/>
        </g>
      </g>
    </g>
    <g id="sgGardenBud">
      <path d="M0 8 C-1 21 -1 31 0 43" fill="none" stroke="#668868" stroke-width="3" stroke-linecap="round"/>
      <path d="M-1 29 Q-18 17 -18 28 Q-11 37 -1 29Z" fill="#8fae85"/>
      <path d="M0 35 Q17 22 18 33 Q11 42 0 35Z" fill="#a7bf99"/>
      <path d="M0 8 C-10 0 -8 -12 0 -19 C9 -12 10 0 0 8Z" fill="#e9c7d5" stroke="#b983a0" stroke-width="1.5"/>
      <path d="M0 7 Q-5 -3 -2 -14" fill="none" stroke="#f9e7ed" stroke-width="2" stroke-linecap="round"/>
      <path d="M-6 6 Q0 1 6 6" fill="none" stroke="#73936e" stroke-width="2.2" stroke-linecap="round"/>
    </g>
  </defs>

  <!-- Quiet mountain layers leave open sky around the focal scene. -->
  <path d="M0 263 L76 151 121 202 207 105 300 228 387 148 470 230 556 158 680 237 V460 H0Z" fill="url(#sgMountainFar)" opacity=".7"/>
  <path d="M0 286 Q115 238 224 271 T441 261 T680 267 V460 H0Z" fill="url(#sgMountainNear)" opacity=".62"/>
  <path d="M0 319 Q122 281 248 307 T486 302 T680 296 V460 H0Z" fill="#c0c6b7" opacity=".78"/>

  <!-- Soft, connected meadow shapes. -->
  <path d="M0 334 Q115 298 231 329 T453 319 T680 314 V460 H0Z" fill="#aabd9d"/>
  <path d="M0 368 Q115 331 245 361 T472 350 T680 346 V460 H0Z" fill="url(#sgMeadow)"/>
  <path d="M0 414 Q145 372 277 407 T520 395 T680 390 V460 H0Z" fill="#819d7b" opacity=".8"/>

  <!-- One flowering cherry tree, with blossoms attached to its branches. -->
  <path d="M555 455 C550 383 535 326 541 272 C545 227 574 183 625 145" fill="none" stroke="#80645f" stroke-width="22" stroke-linecap="round"/>
  <path d="M548 286 C506 250 473 220 426 212 M568 237 C594 204 624 191 664 183 M542 333 C510 306 487 286 460 268" fill="none" stroke="#886b65" stroke-width="10" stroke-linecap="round"/>
  <path d="M409 216 C389 180 405 137 443 124 C452 77 503 56 540 83 C574 49 632 69 641 116 C679 132 681 177 651 199 C642 239 587 253 552 231 C518 258 450 250 432 225Z" fill="#a7b99b"/>
  <path d="M443 180 C432 151 454 128 476 128 C491 101 521 104 536 124 C557 103 586 113 591 139 C617 138 632 159 619 180 C603 204 565 201 548 190 C519 214 475 208 463 191Z" fill="#b7c5a7" opacity=".82"/>
  <g>
    <use href="#sgCherryBloom" transform="translate(438 153) scale(1.15)"/>
    <use href="#sgCherryBloom" transform="translate(470 106) scale(.97)"/>
    <use href="#sgCherryBloom" transform="translate(512 83) scale(1.02)"/>
    <use href="#sgCherryBloom" transform="translate(554 111) scale(1.12)"/>
    <use href="#sgCherryBloom" transform="translate(603 107) scale(1.03)"/>
    <use href="#sgCherryBloom" transform="translate(638 151) scale(.99)"/>
    <use href="#sgCherryBloom" transform="translate(581 179) scale(.94)"/>
    <use href="#sgCherryBloom" transform="translate(520 188) scale(.99)"/>
    <use href="#sgCherryBloom" transform="translate(474 204) scale(.84)"/>
    <use href="#sgCherryBloom" transform="translate(626 202) scale(.91)"/>
  </g>

  <!-- The little bunny gardener is the clear foreground focal point. -->
  <g stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="347" cy="394" rx="45" ry="13" fill="#627c65" opacity=".18" stroke="none"/>
    <path d="M323 271 C309 231 318 194 337 196 C357 198 357 242 350 275Z" fill="url(#sgBunnyFur)" stroke="#d8c9c1" stroke-width="2.3"/>
    <path d="M354 267 C350 227 362 193 380 202 C397 211 384 252 373 278Z" fill="url(#sgBunnyFur)" stroke="#d8c9c1" stroke-width="2.3"/>
    <path d="M329 258 C319 226 330 210 339 212 C348 220 346 244 342 263Z" fill="#e9b3c2" opacity=".9" stroke="none"/>
    <path d="M360 258 C359 229 370 213 378 218 C384 229 374 251 369 263Z" fill="#e9b3c2" opacity=".9" stroke="none"/>

    <ellipse cx="349" cy="352" rx="39" ry="53" fill="url(#sgBunnyFur)" stroke="#d8c9c1" stroke-width="2.2"/>
    <ellipse cx="320" cy="355" rx="13" ry="23" transform="rotate(-24 320 355)" fill="url(#sgBunnyFur)" stroke="#d8c9c1" stroke-width="2"/>
    <ellipse cx="378" cy="354" rx="13" ry="23" transform="rotate(24 378 354)" fill="url(#sgBunnyFur)" stroke="#d8c9c1" stroke-width="2"/>
    <path d="M321 330 Q349 312 378 330 L382 377 Q350 392 318 377Z" fill="#91a98a" stroke="#718d74" stroke-width="2"/>
    <path d="M338 324 Q349 334 360 324 L367 340 Q349 350 331 340Z" fill="url(#sgScarf)" stroke="none"/>
    <path d="M357 335 L376 342 L364 354Z" fill="#cf88a5" stroke="none"/>
    <ellipse cx="349" cy="383" rx="15" ry="7" fill="#e9c8ce" opacity=".78" stroke="none"/>
    <ellipse cx="334" cy="397" rx="18" ry="9" fill="#fff8ed" stroke="#d8c9c1" stroke-width="2"/>
    <ellipse cx="364" cy="397" rx="18" ry="9" fill="#fff8ed" stroke="#d8c9c1" stroke-width="2"/>

    <circle cx="350" cy="293" r="43" fill="url(#sgBunnyFur)" stroke="#d8c9c1" stroke-width="2.4"/>
    <ellipse cx="331" cy="307" rx="8" ry="4.5" fill="#efb8c5" opacity=".78" stroke="none"/>
    <ellipse cx="369" cy="307" rx="8" ry="4.5" fill="#efb8c5" opacity=".78" stroke="none"/>
    <ellipse cx="337" cy="291" rx="3.2" ry="4.2" fill="#59465b" stroke="none"/>
    <ellipse cx="363" cy="291" rx="3.2" ry="4.2" fill="#59465b" stroke="none"/>
    <path d="M346 301 Q350 297 354 301 Q352 307 350 307 Q348 307 346 301Z" fill="#c9829d" stroke="none"/>
    <path d="M350 307 Q345 314 340 310 M350 307 Q355 314 360 310" fill="none" stroke="#80616f" stroke-width="1.8"/>
    <path d="M335 277 Q350 267 365 277" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="3"/>
  </g>

  <!-- Four rooted flowers are the existing touch targets. -->
  <g id="sgGardenPlots"></g>

  <!-- A few low grass strokes ground the illustration without extra ornaments. -->
  <g fill="none" stroke="#6e906f" stroke-width="3" stroke-linecap="round" opacity=".78">
    <path d="M48 433 Q41 411 31 403 M56 434 Q63 411 77 405 M188 440 Q182 417 169 410 M196 440 Q207 420 218 416"/>
    <path d="M435 436 Q428 411 415 405 M445 438 Q456 415 468 410 M627 432 Q618 409 607 404 M637 434 Q650 412 663 410"/>
  </g>
</svg>`;

  const streakFlowerTotal = Math.max(count, bestRun);
  const gardenFlowers = [
    {id:'pink', label:'pink flower', x:14.7, y:79.3, svgX:100, svgY:365, scale:1.72},
    {id:'lavender', label:'lavender flower', x:27.9, y:85.2, svgX:190, svgY:392, scale:1.60},
    {id:'honey', label:'yellow flower', x:40.4, y:87.8, svgX:275, svgY:404, scale:1.54},
    {id:'rose', label:'rose flower', x:61, y:88.7, svgX:415, svgY:408, scale:1.60},
    {id:'peach', label:'peach flower', x:72.5, y:85.2, svgX:493, svgY:392, scale:1.62},
    {id:'lilac', label:'lilac flower', x:83.8, y:80.7, svgX:570, svgY:371, scale:1.60},
    {id:'cream', label:'cream flower', x:93.4, y:87.6, svgX:635, svgY:403, scale:1.48}
  ];
  const earnedGardenFlowers = Math.min(gardenFlowers.length, Math.max(0, streakFlowerTotal));
  const gardenPlantMarkup = gardenFlowers.map((flower, index) =>
    '<use href="#' + (index < earnedGardenFlowers ? 'sgGardenFlower' : 'sgGardenBud') +
    '" transform="translate(' + flower.svgX + ' ' + flower.svgY + ') scale(' + flower.scale + ')"/>'
  ).join('');
  const gardenSceneMarkup = gardenScene.replace('<g id="sgGardenPlots"></g>', '<g>' + gardenPlantMarkup + '</g>');
  const gardenFlowerMarkup = gardenFlowers.map(flower => {
    const watered = gardenBlooms.has(flower.id);
    return '<button type="button" class="sg-garden-flower-hit' + (watered ? ' is-watered' : '') +
      '" data-sg-garden-flower="' + flower.id + '" style="--flower-x:' + flower.x + '%;--flower-y:' + flower.y + '%"' +
      ' aria-label="' + (watered ? 'Watered ' : 'Water ') + flower.label + '" aria-pressed="' + watered + '"' +
      (watered ? ' disabled' : '') + '><span aria-hidden="true"></span></button>';
  }).join('');

  const headingFlowerDecor =
    '<i class="sg-heading-bloom sg-heading-bloom-one" style="--sg-bloom-speed:' + (3.4 + Math.random() * 1.9).toFixed(2) + 's;--sg-bloom-delay:-' + (Math.random() * 2.4).toFixed(2) + 's">✿</i>' +
    '<i class="sg-heading-bloom sg-heading-bloom-two" style="--sg-bloom-speed:' + (4.1 + Math.random() * 1.8).toFixed(2) + 's;--sg-bloom-delay:-' + (Math.random() * 2.8).toFixed(2) + 's">✿</i>';

  content.innerHTML = [
    '<div class="streak-garden-page">',
    '<div class="sg-page-heading"><div><h2>Your Streak Garden</h2></div><span class="sg-heading-doodle" aria-hidden="true">' +
      headingFlowerDecor + '</span></div>',

    '<div class="sg-page-group sg-garden-group" id="sgGardenGroup">',
    '<section class="sg-hero" aria-label="Your current streak garden"><div class="sg-hero-paper">' +
      '<div class="sg-hero-copy"><div class="sg-hero-topline">' +
      '<div class="sg-hero-streak-meta"><span class="sg-eyebrow">CURRENT STREAK</span>' +
      '<div class="sg-count-line"><strong>' + count + '</strong><span><b>' + (count === 1 ? 'day' : 'days') + '</b><small>in a row</small></span></div></div>' +
      '<h3 class="sg-garden-stage">' + gardenStage + '</h3></div></div>' +
      '<div class="sg-hero-scene"><div class="sg-garden-art" id="sgGardenArt">' + gardenSceneMarkup +
        '<div class="sg-garden-hit-layer">' + gardenFlowerMarkup + '</div></div>' +
        '</div>' +
      '<span class="sg-hero-corner sg-corner-one" aria-hidden="true">❧</span></div></section>',
    '</div>',

    '<div class="sg-page-group sg-journal-group" id="sgJournalGroup">',
    '<section class="sg-week-section"><div class="sg-section-heading"><div><h3>Weekly blooms</h3></div></div>' +
      '<div class="sg-week-row">' + week.join('') + '</div></section>',
    '</div>',
    '<div class="sg-garden-switcher" role="tablist" aria-label="Your garden details">' +
      '<button type="button" class="sg-garden-switch' + (streakGardenActiveTab === 'daily' ? ' is-active' : '') + '" data-streak-garden-tab="daily" role="tab" aria-selected="' + (streakGardenActiveTab === 'daily') + '"><span class="sg-switch-icon sg-switch-daily" aria-hidden="true"><svg viewBox="0 0 32 32"><rect x="8" y="6" width="16" height="21" rx="3" fill="#fffaf4" stroke="currentColor" stroke-width="1.8"/><path d="M12 5.5h8a2 2 0 0 1 2 2V9H10V7.5a2 2 0 0 1 2-2Z" fill="#f6e4c5" stroke="currentColor" stroke-width="1.5"/><path d="m12 14 1.8 1.8 3-3.2M12 21l1.8 1.8 3-3.2M19 14h2M19 21h2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="sg-switch-label"><b>Daily Quest</b></span></button>' +
      '<button type="button" class="sg-garden-switch' + (streakGardenActiveTab === 'hearts' ? ' is-active' : '') + '" data-streak-garden-tab="hearts" role="tab" aria-selected="' + (streakGardenActiveTab === 'hearts') + '"><span class="sg-switch-icon sg-switch-hearts" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 27S4.5 19.5 4.5 11.5c0-6 7.5-8 11.5-.8 4-7.2 11.5-5.2 11.5.8C27.5 19.5 16 27 16 27Z" fill="currentColor"/><path d="m11 15 3.5 3.5 7-8" fill="none" stroke="#fffaf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="sg-switch-label"><b>Your Hearts</b></span></button>' +
      '<button type="button" class="sg-garden-switch' + (streakGardenActiveTab === 'flowers' ? ' is-active' : '') + '" data-streak-garden-tab="flowers" role="tab" aria-selected="' + (streakGardenActiveTab === 'flowers') + '"><span class="sg-switch-icon sg-switch-flowers" aria-hidden="true"><svg viewBox="0 0 32 32"><g fill="currentColor"><ellipse cx="16" cy="7" rx="4" ry="6"/><ellipse cx="16" cy="7" rx="4" ry="6" transform="rotate(60 16 16)"/><ellipse cx="16" cy="7" rx="4" ry="6" transform="rotate(120 16 16)"/></g><circle cx="16" cy="16" r="4" fill="#f2c875"/><path d="M16 21v7" stroke="#78966f" stroke-width="2" stroke-linecap="round"/></svg></span><span class="sg-switch-label"><b>Your Flowers</b></span></button></div>',
    '<section class="sg-tab-panel' + (streakGardenActiveTab === 'flowers' ? ' is-active' : '') + '" id="sgFlowersPanel" role="tabpanel"' + (streakGardenActiveTab === 'flowers' ? '' : ' hidden') + '>' +
      '<section class="sg-milestones-section"><div class="sg-section-heading"><div><h3>Your Flowers</h3><p>' + milestones.filter(item => count >= item.days).length + ' of ' + milestones.length + ' garden milestones unlocked</p></div></div>' +
      '<div class="sg-milestone-route">' + badges + '</div></section></section>',
    '<section class="sg-tab-panel' + (streakGardenActiveTab === 'hearts' ? ' is-active' : '') + '" id="sgHeartsPanel" role="tabpanel"' + (streakGardenActiveTab === 'hearts' ? '' : ' hidden') + '>' +
      '<section class="sg-milestones-section sg-hearts-section"><div class="sg-section-heading"><div><h3>Your Hearts</h3><p>' + heartCount + ' hearts received · ' + heartMilestones.filter(item => heartCount >= item.hearts).length + ' of ' + heartMilestones.length + ' milestones unlocked</p></div></div>' +
      '<div class="sg-milestone-route">' + heartBadges + '</div></section></section>',
    '<section class="sg-tab-panel' + (streakGardenActiveTab === 'daily' ? ' is-active' : '') + '" id="sgDailyPanel" role="tabpanel"' + (streakGardenActiveTab === 'daily' ? '' : ' hidden') + '>' +
      '<section class="sg-daily-quests-section"><div class="sg-section-heading"><div><h3>Daily Quest</h3><p>20-day garden adventure · Day ' + (Math.floor(Math.max(0,(new Date(todayKey + 'T00:00:00Z') - new Date('2026-11-21T00:00:00Z')) / 86400000) % 20) + 1) + ' of 20 · 20 chat + 20 photo quests</p></div><span class="sg-goal-count">' + completedQuests + ' / 3</span></div>' +
      dailyQuestMarkup + petalRewardsMarkup + weeklyMarkup + collectibleMarkup + '</section></section>',
    '</div>',
    '</div>',
  ].join('');
  startStreakCountdown();
  syncPresenceUI();
}

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

function openStreakGarden() {
  const content = $('#content');
  try {
    if (page !== 'streak') go('streak');
    else renderStreakPage();
    if (!content?.querySelector('.streak-garden-page')) renderStreakPage();
    if (!content?.querySelector('.streak-garden-page')) {
      throw new Error('The Streak Garden page did not finish rendering.');
    }
  } catch (error) {
    console.error('Streak Garden failed to open:', error);
    if (content) {
      const message = error && error.message ? error.message : 'An unexpected page error occurred.';
      content.innerHTML = '<section class="sg-load-error"><span aria-hidden="true">🌱</span><h2>Your garden needs a moment</h2><p>The Streak Garden could not finish opening.</p><small>' +
        esc(message) + '</small><button type="button" class="primary" data-streak-retry>Try opening again</button></section>';
    }
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
function chatMessageMarkup(m, showMeta = true, isContinuation = false, showSeen = false) {
  const owner = m.author || {};
  const ownerId = owner.id || m.owner_id || '';
  const mine = String(ownerId) === String(me?.id || '');
  const id = String(m.id);
  const liked = Number(m.like_count || 0) > 0;
  const messageValue = String(m.text || '');
  const messageCharacterCount = noteGraphemeSegmenter
    ? [...noteGraphemeSegmenter.segment(messageValue)].length
    : Array.from(messageValue).length;
  const messageWordCount = messageValue.trim() ? messageValue.trim().split(/\s+/u).length : 0;
  const isShortMessage = messageWordCount < 4;
  const hasHeartReaction = messageCharacterCount >= 6;
  const heartButton = hasHeartReaction
    ? `<span class="memory-heart-toggle reaction-heart-indicator${liked ? ' is-lit' : ''}" aria-hidden="true"><span class="heart-wallpaper-fill">♥</span><span class="heart-outline-glyph">${liked ? '♥' : '♡'}</span></span>`
    : '';
  const name = esc(owner.displayName || owner.display_name || owner.username || 'Friend');
  const handle = esc(owner.username || 'friend');
  const pet = esc(owner.mascot || '🐰');
  const messageText = esc(m.text || '');
  const createdAt = m.createdAt || m.created_at || '';
  const time = esc(formatNoteClock(createdAt));
  const editedLabel = m.edited_at ? '<small class="chat-edited-label">Edited</small>' : '';
  const senderTag = mine ? 'div' : 'button';
  const senderAttrs = mine ? '' : `type="button" data-friend-profile="${handle}" data-friend-id="${esc(ownerId)}" aria-label="Open ${name}'s profile"`;
  const senderMeta = showMeta ? `
        <${senderTag} class="chat-meta${mine ? '' : ' chat-sender-link'}" ${senderAttrs}>
          <span class="sender-pet" aria-hidden="true">${pet}</span>
          <b title="${name}">${name}</b>
          <small>@${handle}</small>
        </${senderTag}>
  ` : '';
  const seenLabel = m.last_seen_at ? formatSeenRelative(m.last_seen_at) : 'Seen';
  const seenReceipt = showSeen && mine && Number(m.seen_by_count || 0) > 0
    ? '<small class="chat-seen-receipt" data-seen-at="' + esc(m.last_seen_at || '') + '" aria-label="' + esc(seenLabel) + '">' + esc(seenLabel) + '</small>'
    : '';
  const replyTarget = m.reply_to_id ? feed.find(item => String(item.id) === String(m.reply_to_id)) : null;
  const replyAuthor = replyTarget?.author?.displayName || replyTarget?.author?.display_name || replyTarget?.author?.username || 'Original message';
  const replyText = replyTarget?.text || 'This message is no longer available';
  const replyMarkup = m.reply_to_id ? `<button type="button" class="chat-reply-preview" data-chat-jump="${esc(m.reply_to_id)}" aria-label="Jump to original message"><span class="chat-reply-preview-quote"><span class="chat-reply-preview-text">${esc(replyText)}</span></span></button>` : '';

  return `
    <div class="chat-message ${mine ? 'is-mine' : 'is-friend'}${liked ? ' is-loved' : ''}${m.isPending ? ' is-uploading' : ''}${isContinuation ? ' is-continuation' : ''}" data-kind="note" data-memory="${esc(id)}" data-owner="${esc(ownerId)}" data-like-count="${Number(m.like_count) || 0}" data-reaction-count="${Array.isArray(m.reactions) ? m.reactions.length : 0}">
      <div class="chat-message-content">
        ${senderMeta}
        <div class="chat-message-line">
          <time class="chat-message-time" datetime="${esc(createdAt)}">${time}</time>${editedLabel}
          <div class="chat-bubble-wrap">
            <div class="chat-bubble${hasHeartReaction ? '' : ' no-heart-reaction'}${isShortMessage ? ' is-short-message' : ''}" tabindex="0" data-chat-message-id="${esc(id)}" aria-label="Message from ${name}">
              ${heartButton}
              ${replyMarkup}
              <span class="chat-message-text" dir="auto">${messageText}</span>
            </div>
          </div>
        </div>
      </div>
      ${seenReceipt}
      ${m.isPending ? '<span class="memory-upload-status" role="status">Sending your message…</span>' : ''}
    </div>
  `;
}

function memoryCard(m, options = {}) {
  const owner = m.author || {};
  const name = esc(owner.displayName || owner.display_name || 'Friend');
  const handle = esc(owner.username || '');
  const pet = esc(owner.mascot || '🐰');
  const isLiked = Number(m.like_count || 0) > 0;
  const liked = isLiked ? ' is-loved' : '';
  const heartButton = `<span class="memory-heart-toggle reaction-heart-indicator${isLiked ? ' is-lit' : ''}" aria-hidden="true"><span class="heart-wallpaper-fill">♥</span><span class="heart-outline-glyph">${isLiked ? '♥' : '♡'}</span></span>`;
  const sorted = [me?.id, ...friends.map(f => f.id)].filter(Boolean).map(String).sort();
  const tone = sorted.indexOf(String(owner.id || m.owner_id || '')) % 2 ? 'tone-lavender' : 'tone-peach';
  const pending = pendingDeleteTimers.has(String(m.id)) ? ' is-pending-delete' : '';
  const uploading = m.isPending ? ' is-uploading' : '';
  const mine = String(owner.id || m.owner_id || '') === String(me?.id || '');

  let body = '';
  if (m.kind === 'photo') {
    body = `<div class="tile${liked}">${heartButton}<div class="photo-frame"><img class="feed-photo is-loading" loading="lazy" decoding="async" data-media="${esc(m.id)}" ${m.previewUrl ? `src="${esc(m.previewUrl)}"` : ""} alt="Shared photo" role="button" tabindex="0" aria-label="Open full photo" draggable="false"></div></div>`;
  } else if (m.kind === 'song') {
    const songAction = m.isPending ? '' : mine
      ? `<button class="song-download card-song-save card-song-delete" type="button" data-memory-delete="${esc(m.id)}" aria-label="Delete song">Delete</button>`
      : `<button class="song-download card-song-save" type="button" data-memory-download="${esc(m.id)}" aria-label="Save song">Save</button>`;
    body = `<div class="tile song-card${liked}">${heartButton}<button class="album-art play-song" data-play-song="${esc(m.id)}" aria-label="Play ${esc(m.fileName || 'song')}" aria-pressed="false" ${m.isPending ? "disabled" : ""}><span class="song-glyph" aria-hidden="true">🎼</span><span class="song-note" aria-hidden="true">♫</span></button><span class="memory-title song-title-label" title="${esc(m.fileName || m.text || 'A little song')}">${esc(m.fileName || m.text || 'A little song')}</span>${songAction}</div>`;
  } else {
    const isContinuation = m.kind === 'note' && !!options.isContinuation;
    body = chatMessageMarkup(m, !isContinuation, isContinuation);
  }

  const authorLine = m.kind === 'note' ? '' : `<div class="feed-by"><span class="sender-pet" aria-label="${pet}">${pet}</span> <b title="${name}">${name}</b> <small>@${handle}</small></div>`;
  const ownerIndicator = mine && m.kind !== 'note' ? `<span class="memory-owner-indicator" aria-hidden="true">Your memory</span>` : '';
  const continuationClass = m.kind === 'note' && options.isContinuation ? ' is-continuation' : '';
  return `<article class="feed-item ${tone}${pending}${uploading}${m.kind === 'note' ? ' home-note-memory' : ''}${continuationClass}" data-kind="${esc(m.kind)}" data-memory="${esc(m.id)}" data-owner="${esc(owner.id || m.owner_id || '')}">${authorLine}${body}${ownerIndicator}</article>`;
}

function syncChatReplyPreview() {
  const preview = $('#chatReplyingTo');
  if (!preview) return;
  const item = replyingToMessageId
    ? feed.find(memory => String(memory.id) === String(replyingToMessageId))
    : null;
  preview.hidden = !item;
  const replyOwnerId = String(item?.author?.id || item?.owner_id || '');
  const isMine = !!item && replyOwnerId === String(me?.id || '');
  preview.classList.toggle('is-mine', isMine);
  preview.classList.toggle('is-friend', !!item && !isMine);
  preview.innerHTML = item
    ? `<div class="chat-replying-content"><span class="chat-replying-message">${esc(item.text || 'Message unavailable')}</span></div><button type="button" data-chat-reply-cancel aria-label="Cancel reply">×</button>`
    : '';
}

/* Clean Notes conversation; message markup is shared with Home → Memory History. */
function renderNotesPage(options = {}) {
  startNotesIncomingPoll();
  if (!seenRelativeInterval) {
    seenRelativeInterval = setInterval(() => {
      if (page !== 'notes') return;
      document.querySelectorAll('#chatSeenStatus[data-seen-at]').forEach(node => {
        const label = formatSeenRelative(node.dataset.seenAt);
        node.textContent = label;
        node.setAttribute('aria-label', label);
      });
    }, 15000);
  }
  const content = $('#content');
  if (!content) return;

  const chatNotes = feed
    .filter(m => m.kind === 'note' && !hiddenNoteIds.has(String(m.id)) && !pendingDeleteTimers.has(String(m.id)))
    .slice()
    .reverse();
  void markNotesDelivered(chatNotes);

  let previousLabel = '';
  let previousOwnerId = '';
  const messagesHtml = chatNotes.map(m => {
    const label = noteDayLabel(m.createdAt || m.created_at);
    const ownerId = String(m.author?.id || m.owner_id || '');
    const isNewDay = label !== previousLabel;
    const divider = isNewDay ? `<div class="chat-day-divider"><span>${esc(label)}</span></div>` : '';
    const isContinuation = !isNewDay && !!ownerId && ownerId === previousOwnerId;
    previousLabel = label;
    previousOwnerId = ownerId;
    return divider + chatMessageMarkup(m, !isContinuation, isContinuation, false);
  }).join('');
  const emptyMarkup = '<div class="chat-empty"><span>💌</span><b>Your conversation starts here</b><small>Send the first little hello ♡</small></div>';
  // The Seen indicator reflects the newest conversation note, and is shown
  // whenever that note has a reader cursor—even if the timestamp is unavailable.
  const latestNote = chatNotes
    .filter(note => !note.isPending)
    .slice()
    .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))[0];
  const latestOwnerId = String(latestNote?.author?.id || latestNote?.owner_id || '');
  const latestIsMine = !!latestNote && latestOwnerId === String(me?.id || '');
  const latestHasBeenSeen = latestIsMine && Number(latestNote.seen_by_count || 0) > 0;
  const latestSeenAt = latestHasBeenSeen ? String(latestNote.last_seen_at || '') : '';
  const latestSeenLabel = latestHasBeenSeen
    ? (latestSeenAt ? formatSeenRelative(latestSeenAt) : 'Seen')
    : '';
  const olderControl = historySentinelMarkup('top');
  const existingThread = $('#chatThread');
  const updateSeenStatus = () => {
    const status = $('#chatSeenStatus');
    if (!status) return;
    status.hidden = !latestHasBeenSeen;
    status.textContent = latestSeenLabel;
    status.setAttribute('aria-label', latestSeenLabel || 'Not seen');
    if (latestSeenAt) status.dataset.seenAt = latestSeenAt;
    else delete status.dataset.seenAt;
  };
  updateSeenStatus();
  syncChatReplyPreview();

  // Do not rebuild an unchanged conversation on every realtime/status tick.
  // Keeping its message nodes mounted prevents scroll, focus and CSS animation jumps.
  const desiredThreadMarkup = olderControl + (messagesHtml || emptyMarkup);
  if (existingThread && existingThread.__cbNotesMarkup === desiredThreadMarkup) {
    syncNotesTypingIndicator();
    return;
  }

  // Reconcile message nodes by ID instead of replacing the whole thread.
  // Existing bubbles keep their DOM identity, so incoming messages and receipts
  // cannot restart entrance effects or make the conversation blink.
  if (existingThread) {
    const wasNearBottom =
      existingThread.scrollHeight - existingThread.scrollTop - existingThread.clientHeight < 72;
    const previousScrollTop = existingThread.scrollTop;
    const desiredRoot = document.createElement('div');
    desiredRoot.innerHTML = desiredThreadMarkup;
    const currentById = new Map(
      [...existingThread.querySelectorAll(':scope > .chat-message[data-memory]')]
        .map(node => [String(node.dataset.memory), node])
    );
    const currentDividers = [...existingThread.querySelectorAll(':scope > .chat-day-divider')];
    const usedDividers = new Set();
    const nextNodes = [];

    [...desiredRoot.children].forEach(desiredNode => {
      if (desiredNode.matches('.chat-message[data-memory]')) {
        const id = String(desiredNode.dataset.memory);
        const current = currentById.get(id);
        if (current) {
          // Message rows are immutable after delivery; live Seen/pending metadata
          // must not replace the bubble node or replay its entrance animation.
          const desiredReceipt = desiredNode.querySelector('.chat-seen-receipt');
          const currentReceipt = current.querySelector('.chat-seen-receipt');
          if (desiredReceipt && currentReceipt) {
            currentReceipt.textContent = desiredReceipt.textContent;
            currentReceipt.setAttribute('aria-label', desiredReceipt.getAttribute('aria-label') || 'Seen');
            if (desiredReceipt.dataset.seenAt) currentReceipt.dataset.seenAt = desiredReceipt.dataset.seenAt;
            else delete currentReceipt.dataset.seenAt;
          } else if (desiredReceipt && !currentReceipt) {
            current.append(desiredReceipt);
          } else if (!desiredReceipt && currentReceipt) {
            currentReceipt.remove();
          }
          const desiredText = desiredNode.querySelector('.chat-message-text')?.textContent;
          const currentText = current.querySelector('.chat-message-text');
          if (currentText && desiredText != null && currentText.textContent !== desiredText) currentText.textContent = desiredText;
          const desiredReply = desiredNode.querySelector('.chat-reply-preview');
          const currentReply = current.querySelector('.chat-reply-preview');
          if (desiredReply && currentReply) { currentReply.innerHTML = desiredReply.innerHTML; currentReply.dataset.chatJump = desiredReply.dataset.chatJump; }
          else if (desiredReply && !currentReply) current.querySelector('.chat-bubble')?.prepend(desiredReply);
          else if (!desiredReply && currentReply) currentReply.remove();
          const desiredReactions = desiredNode.querySelector('.chat-message-reactions');
          const currentReactions = current.querySelector('.chat-message-reactions');
          if (desiredReactions && currentReactions) currentReactions.replaceWith(desiredReactions);
          else if (desiredReactions && !currentReactions) current.querySelector('.chat-bubble-wrap')?.append(desiredReactions);
          else if (!desiredReactions && currentReactions) currentReactions.remove();
          const desiredTime = desiredNode.querySelector('.chat-message-time');
          const currentTime = current.querySelector('.chat-message-time');
          if (desiredTime && currentTime && currentTime.dateTime !== desiredTime.dateTime) {
            currentTime.dateTime = desiredTime.dateTime;
            currentTime.textContent = desiredTime.textContent;
          }
          current.classList.toggle('is-uploading', desiredNode.classList.contains('is-uploading'));
          current.classList.toggle('is-loved', desiredNode.classList.contains('is-loved'));
          current.setAttribute('data-like-count', desiredNode.getAttribute('data-like-count') || '0');
          current.setAttribute('data-reaction-count', desiredNode.getAttribute('data-reaction-count') || '0');
          nextNodes.push(current);
        } else {
          nextNodes.push(desiredNode);
        }
      } else if (desiredNode.matches('.chat-day-divider')) {
        const match = currentDividers.find(node =>
          !usedDividers.has(node) && node.textContent === desiredNode.textContent
        );
        if (match) {
          usedDividers.add(match);
          nextNodes.push(match);
        } else {
          nextNodes.push(desiredNode);
        }
      } else {
        const match = [...existingThread.children].find(node =>
          !nextNodes.includes(node) &&
          node.className === desiredNode.className &&
          node.outerHTML === desiredNode.outerHTML
        );
        nextNodes.push(match || desiredNode);
      }
    });

    // Keep nodes already in the correct position completely untouched.
    // Move only nodes whose order actually changed, then remove stale children.
    nextNodes.forEach((node, index) => {
      const atPosition = existingThread.children[index];
      if (atPosition !== node) existingThread.insertBefore(node, atPosition || null);
    });
    [...existingThread.children].forEach(node => {
      if (!nextNodes.includes(node) && node.id !== 'chatTypingIndicator') node.remove();
    });
    existingThread.__cbNotesMarkup = desiredThreadMarkup;
    syncNotesTypingIndicator();

    requestAnimationFrame(() => {
      if (!existingThread.isConnected) return;
      if (options.followLatest || wasNearBottom) {
        existingThread.scrollTop = existingThread.scrollHeight;
      } else {
        existingThread.scrollTop = Math.min(
          previousScrollTop,
          Math.max(0, existingThread.scrollHeight - existingThread.clientHeight)
        );
      }
      syncNotesKeyboardLayout();
      syncNotesSeenReceiptVisibility(existingThread);
      observeNoteSeenMessages();
    });
    return;
  }

  content.innerHTML = `
    <section class="chat-page" aria-label="Notes conversation">
      <div class="chat-thread" id="chatThread" aria-live="polite">
        ${olderControl}${messagesHtml || emptyMarkup}
        <div id="chatTypingIndicator" class="chat-typing-indicator" aria-live="polite" aria-atomic="true" hidden></div>
      </div>
      <form id="chatComposer" class="chat-composer" autocomplete="off">
        <div id="chatReplyingTo" class="chat-replying-to" ${replyingToMessageId ? '' : 'hidden'}></div>
        <small id="chatSeenStatus" class="chat-seen-receipt chat-seen-status" ${latestSeenAt ? 'data-seen-at="' + esc(latestSeenAt) + '"' : ''} aria-label="${esc(latestSeenLabel || "Not seen")}" ${latestHasBeenSeen ? "" : "hidden"}>${esc(latestSeenLabel)}</small>
        <textarea id="chatInput" class="input" maxlength="1000" rows="1" enterkeyhint="enter" inputmode="text" autocapitalize="sentences" spellcheck="true" aria-multiline="true" placeholder="Write a little message…" aria-label="Write a little message"></textarea>
        <button type="submit" class="primary" id="chatSend" aria-label="Send message" hidden>💌</button>
      </form>
    </section>
  `;

  requestAnimationFrame(() => {
    syncNotesKeyboardLayout();
    const thread = $('#chatThread');
    if (thread) {
      thread.__cbNotesMarkup = olderControl + (messagesHtml || emptyMarkup);
      thread.scrollTop = thread.scrollHeight;
      syncNotesTypingIndicator();
    }
    syncNotesSeenReceiptVisibility(thread);
    observeNoteSeenMessages();
  });
}

/* Achievement Garden — milestones are derived from the signed-in user's real app activity. */
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
    { id:'first-memory', icon:'📖', title:'First Little Memory', detail:'Save your first shared moment', value:stats.memories, goal:1, unit:'memory' },
    { id:'photo-collector', icon:'🌷', title:'Photo Collector', detail:'Keep five photos in your garden', value:stats.photos, goal:5, unit:'photos' },
    { id:'love-letter', icon:'💌', title:'Little Correspondent', detail:'Share five notes together', value:stats.notes, goal:5, unit:'notes' },
    { id:'playlist-curator', icon:'🎶', title:'Playlist Curator', detail:'Add three songs to your playlist', value:stats.songs, goal:3, unit:'songs' },
    { id:'week-of-wonder', icon:'🌼', title:'Week of Wonder', detail:'Reach a seven-day login streak', value:stats.streak, goal:7, unit:'days' },
    { id:'heart-keeper', icon:'💗', title:'Heart Keeper', detail:'Collect one hundred hearts on your memories', value:stats.hearts, goal:100, unit:'hearts' }
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
  const remaining = achievements.filter(item => !saved[item.id]);
  if (!remaining.length) return '';
  return `
    <section class="achievement-garden" aria-labelledby="achievementGardenTitle">
      <div class="achievement-garden-heading">
        <div><small>A FEW LITTLE GOALS</small><h3 id="achievementGardenTitle">Growing together <span aria-hidden="true">✿</span></h3><p>Small moments, lovely milestones.</p></div>
        <div class="achievement-count"><strong>${earnedCount}/${achievements.length}</strong><span>unlocked</span></div>
      </div>
      <div class="achievement-grid">
        ${remaining.map(item => {
          const progress = Math.min(100, Math.round((item.value / item.goal) * 100));
          const amount = Math.min(item.value, item.goal);
          const art = item.id === 'first-memory' ? 'note' : item.id === 'photo-collector' ? 'photo' : item.id === 'love-letter' ? 'kissNote' : item.id === 'playlist-curator' ? 'song' : item.id === 'week-of-wonder' ? 'bloom-7' : 'hearts';
          return `<article class="achievement-card">
            <div class="achievement-medallion achievement-art" aria-hidden="true">${gardenIllustration(art)}</div>
            <div class="achievement-copy"><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p>
              <div class="achievement-progress" role="progressbar" aria-label="${esc(item.title)} progress" aria-valuemin="0" aria-valuemax="${item.goal}" aria-valuenow="${amount}"><span style="width:${progress}%"></span></div>
              <small>${amount} / ${item.goal} ${esc(item.unit)}</small>
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
  const pics = page === 'gallery' ? allPics.slice(0, mediaVisibleCount.photo) : allPics;
  const songs = page === 'music' ? allSongs.slice(0, mediaVisibleCount.song) : allSongs;
  const notes = visibleFeed.filter(x => x.kind === 'note');

  if (page === 'home') {
    destroyBearPoseEngine();
    c.innerHTML = `
      <div class="hero home-hero">
        <div>
          <small>✿ MADE FOR LITTLE MOMENTS</small>
          <h3>A little world to keep close</h3>
          <p>Four small corners for the moments you share together.</p>
          <button class="primary" data-go="friends">Find your friend ♡</button>
        </div>
        <button class="hero-art bunny-button" id="bunnyBuddy" aria-label="Open your profile">
          <span>☁️</span><span>${esc(me?.mascot || '🐰')}</span><span class="hero-side-flower" aria-hidden="true"><svg viewBox="0 0 48 58"><defs><linearGradient id="sidePetal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f9dce7"/><stop offset="1" stop-color="#d98eae"/></linearGradient><radialGradient id="sideCore"><stop stop-color="#fff0b8"/><stop offset="1" stop-color="#e9b85f"/></radialGradient></defs><path d="M24 31Q22 44 24 55" fill="none" stroke="#78977d" stroke-width="2.4" stroke-linecap="round"/><path d="M23 46Q11 36 7 43Q13 53 23 49Z" fill="#b8cfad" stroke="#78977d" stroke-width="1.2"/><path d="M25 49Q34 38 41 43Q38 53 25 52Z" fill="#c9d9b9" stroke="#78977d" stroke-width="1.2"/><g fill="url(#sidePetal)" stroke="#fff8f2" stroke-width="1.6"><ellipse cx="24" cy="17" rx="5.4" ry="9" transform="rotate(0 24 17)"/><ellipse cx="24" cy="17" rx="5.4" ry="9" transform="rotate(60 24 17)"/><ellipse cx="24" cy="17" rx="5.4" ry="9" transform="rotate(120 24 17)"/></g><g fill="none" stroke="#fff7f1" stroke-width=".8" opacity=".75"><path d="M24 10Q23 14 24 16M16 17Q20 17 22 18M28 18Q31 16 33 14"/></g><circle cx="24" cy="17" r="4.2" fill="url(#sideCore)" stroke="#fff8f2" stroke-width="1.4"/><circle cx="22.5" cy="15.5" r="1" fill="#fff9dc" opacity=".9"/></svg></span>
          <svg class="doodle-bouquet" viewBox="0 0 94 72" aria-hidden="true"><defs><linearGradient id="petalPink" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe6ed"/><stop offset="1" stop-color="#dc8eaa"/></linearGradient><linearGradient id="petalLilac" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0e7ff"/><stop offset="1" stop-color="#bba4dc"/></linearGradient><linearGradient id="petalPeach" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0d2"/><stop offset="1" stop-color="#e9b778"/></linearGradient><radialGradient id="flowerGold"><stop stop-color="#fff2bd"/><stop offset="1" stop-color="#e6ad59"/></radialGradient></defs><g class="stems" fill="none" stroke="#78977d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M46 66Q27 43 17 24M46 66Q40 39 42 15M46 66Q58 43 76 25"/><path d="M37 56Q22 48 15 55Q23 65 39 60M51 57Q66 46 76 54Q69 65 51 61"/></g><g fill="#b8cfad" stroke="#78977d" stroke-width="1.3"><path d="M31 49Q15 35 10 43Q16 55 31 49Z"/><path d="M57 50Q70 34 81 42Q76 55 57 50Z"/></g><g fill="none" stroke="#e8f0df" stroke-width=".8" opacity=".9"><path d="M14 44Q21 46 27 48M61 47Q69 44 77 43"/></g><g stroke="#fff9f3" stroke-width="1.45"><g fill="url(#petalPink)"><ellipse cx="17" cy="19" rx="4.1" ry="7.3"/><ellipse cx="17" cy="19" rx="4.1" ry="7.3" transform="rotate(72 17 19)"/><ellipse cx="17" cy="19" rx="4.1" ry="7.3" transform="rotate(144 17 19)"/><ellipse cx="17" cy="19" rx="4.1" ry="7.3" transform="rotate(216 17 19)"/><ellipse cx="17" cy="19" rx="4.1" ry="7.3" transform="rotate(288 17 19)"/></g><g fill="url(#petalLilac)"><path d="M42 5C35 9 34 17 42 22C50 17 49 9 42 5Z"/><path d="M42 5C50 9 50 17 42 22C34 17 34 9 42 5Z" transform="rotate(60 42 14)"/><path d="M42 5C50 9 50 17 42 22C34 17 34 9 42 5Z" transform="rotate(120 42 14)"/></g><g fill="url(#petalPeach)"><ellipse cx="76" cy="21" rx="4.8" ry="8"/><ellipse cx="76" cy="21" rx="4.8" ry="8" transform="rotate(72 76 21)"/><ellipse cx="76" cy="21" rx="4.8" ry="8" transform="rotate(144 76 21)"/><ellipse cx="76" cy="21" rx="4.8" ry="8" transform="rotate(216 76 21)"/><ellipse cx="76" cy="21" rx="4.8" ry="8" transform="rotate(288 76 21)"/></g></g><g fill="url(#flowerGold)" stroke="#fff9f1" stroke-width="1.2"><circle cx="17" cy="19" r="3.1"/><circle cx="42" cy="14" r="3.1"/><circle cx="76" cy="21" r="3.3"/></g><g fill="#fff8e8" opacity=".9"><circle cx="16" cy="18" r=".8"/><circle cx="41" cy="13" r=".8"/><circle cx="75" cy="20" r=".9"/></g><g fill="#f2c5d5" opacity=".85"><circle cx="29" cy="28" r="1.5"/><circle cx="59" cy="29" r="1.7"/><circle cx="87" cy="39" r="1.4"/></g></svg>
          <i>✦</i>
        </button>
      </div>
      <div class="daily" id="dailyCard" role="button" tabindex="0" aria-label="A little kindness for today. Tap for another reminder">
        <span class="daily-icon">🌼</span><div><small>A LITTLE KINDNESS FOR TODAY</small><p id="compliment">${esc(getKindness())}</p></div>
      </div>
      ${renderKindnessEventMarkup()}
      <div class="toolbar"><h3>Your happy things</h3><span>${visibleFeed.length} shared memories</span></div>
      <div class="grid happy-things-grid">
        ${streakWidget()}
        <article class="tile"><button type="button" class="tile-art note-art happy-thing-art happy-note-thumbnail" data-happy-go="notes" aria-label="Open Little Love Notes"><svg viewBox="0 0 220 132" role="img" aria-hidden="true"><defs><linearGradient id="note-paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffefa"/><stop offset="1" stop-color="#fff0f3"/></linearGradient><linearGradient id="note-envelope" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3c5d3"/><stop offset="1" stop-color="#df91ad"/></linearGradient><filter id="note-shadow" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="3"/></filter></defs><ellipse cx="111" cy="113" rx="66" ry="8" fill="#b77f98" opacity=".17" filter="url(#note-shadow)"/><g class="note-artwork"><g transform="rotate(-9 82 67)"><rect x="42" y="29" width="91" height="76" rx="8" fill="#f8e9ec" stroke="#d9a8b7" stroke-width="2"/><path d="M54 45h56M54 54h44M54 63h51" stroke="#d9b2bf" stroke-width="2" stroke-linecap="round"/><path d="M54 82q11-9 22 0t22 0" fill="none" stroke="#e3a7bb" stroke-width="2"/><path d="M106 88c-5-7-14-2-11 5 2 4 11 10 11 10s9-6 11-10c3-7-6-12-11-5Z" fill="#e6a1b9"/></g><g transform="rotate(5 133 67)"><rect x="91" y="18" width="88" height="91" rx="10" fill="url(#note-paper)" stroke="#d7a0b4" stroke-width="2.5"/><path d="M103 38h49M103 48h56M103 58h45M103 68h52" stroke="#e6c4ce" stroke-width="2.4" stroke-linecap="round"/><path d="M103 82q13-7 25 0t25 0" fill="none" stroke="#edc5d1" stroke-width="2"/><path d="M103 91h31" stroke="#e6c4ce" stroke-width="2" stroke-linecap="round"/><circle cx="164" cy="29" r="5" fill="#e6b66f"/></g><g transform="translate(59 77)"><path d="M0 0 53-28l54 28-54 34Z" fill="url(#note-envelope)" stroke="#c77f9e" stroke-width="2.2" stroke-linejoin="round"/><path d="m0 0 53 34L107 0" fill="#f8dce5" stroke="#c77f9e" stroke-width="2.2" stroke-linejoin="round"/><path d="M43 4c-6-8-16-2-12 6 2 5 12 12 12 12s10-7 12-12c4-8-6-14-12-6Z" fill="#d87899" stroke="#fff2f5" stroke-width="1.5"/></g><path d="M183 35c-5-7-14-2-11 5 2 4 11 10 11 10s9-6 11-10c3-7-6-12-11-5Z" fill="#e6a1b9"/><path d="m38 34 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#d9b36e"/></g></svg></button><h3>Little Love Notes</h3><p>${notes.length} saved notes</p><button class="primary" data-go="notes">Open notes →</button></article>
        <article class="tile"><button type="button" class="tile-art photo-art happy-thing-art happy-photo-thumbnail" data-happy-go="gallery" aria-label="Open Photo Garden"><svg viewBox="0 0 220 132" role="img" aria-hidden="true"><ellipse cx="110" cy="112" rx="63" ry="8" fill="#8fae8b" opacity=".17"/><rect x="68" y="20" width="84" height="91" rx="13" fill="#fffaf4" stroke="#c4d5b8" stroke-width="2.5" transform="rotate(-5 110 65)"/><rect x="79" y="29" width="84" height="91" rx="13" fill="#fffdf8" stroke="#b9cda9" stroke-width="2.5" transform="rotate(5 120 74)"/><rect x="88" y="38" width="68" height="69" rx="8" fill="#e8f0df"/><circle cx="122" cy="65" r="12" fill="#f2c6d1"/><circle cx="122" cy="51" r="7" fill="#e8a7ba"/><circle cx="136" cy="65" r="7" fill="#e8a7ba"/><circle cx="122" cy="79" r="7" fill="#e8a7ba"/><circle cx="108" cy="65" r="7" fill="#e8a7ba"/><circle cx="122" cy="65" r="5" fill="#e4be73"/><path d="M93 96q15-25 29-7t28-2" fill="none" stroke="#8da77e" stroke-width="3" stroke-linecap="round"/></svg></button><h3>Photo Garden</h3><p>${pics.length} shared photos</p><button class="primary" data-go="gallery">Open photos →</button></article>
        <article class="tile"><button type="button" class="tile-art music-art happy-thing-art happy-music-thumbnail" data-happy-go="music" aria-label="Open Cozy Playlist"><svg viewBox="0 0 220 132" role="img" aria-hidden="true"><defs><linearGradient id="music-deck" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4eafa"/><stop offset="1" stop-color="#cdb9e2"/></linearGradient><linearGradient id="music-vinyl" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#806d9d"/><stop offset=".55" stop-color="#544968"/><stop offset="1" stop-color="#9882ae"/></linearGradient></defs><ellipse cx="111" cy="113" rx="68" ry="8" fill="#8e79a9" opacity=".17"/><g class="music-artwork"><g transform="rotate(-5 111 75)"><rect x="43" y="40" width="136" height="66" rx="13" fill="url(#music-deck)" stroke="#a58cbd" stroke-width="2.5"/><rect x="51" y="48" width="120" height="50" rx="9" fill="#f9f3fb" opacity=".8"/><circle cx="105" cy="73" r="35" fill="url(#music-vinyl)" stroke="#76618f" stroke-width="2"/><circle cx="105" cy="73" r="27" fill="none" stroke="#c9b8d8" stroke-width="1.2" opacity=".48"/><circle cx="105" cy="73" r="20" fill="none" stroke="#c9b8d8" stroke-width="1.2" opacity=".42"/><circle cx="105" cy="73" r="12" fill="#f0c7d5" stroke="#b986a5" stroke-width="1.5"/><path d="M105 66c-4-5-10-1-7 4 1 3 7 7 7 7s6-4 7-7c3-5-3-9-7-4Z" fill="#b86f91"/><circle cx="105" cy="73" r="2.2" fill="#fff5f7"/><path d="M145 55 160 55 160 83Q160 91 152 91Q144 91 144 84Q144 77 153 77Q156 77 158 79V61H145Z" fill="#b79acb"/><path d="M60 58h13M60 64h8" stroke="#d4bfdc" stroke-width="2" stroke-linecap="round"/></g><path d="M52 29q-9 11 0 22m118-25q9 11 0 22" fill="none" stroke="#b29ac8" stroke-width="3" stroke-linecap="round"/><path d="M185 32c-5-7-14-2-11 5 2 4 11 10 11 10s9-6 11-10c3-7-6-12-11-5Z" fill="#d9b2df"/><path d="m38 81 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#d9b36e"/></g></svg></button><h3>Cozy Playlist</h3><p>${songs.length} shared songs</p><button class="primary" data-go="music">Open music →</button></article>
      </div>

      <section class="couple-bear-game" id="coupleBearGame" aria-labelledby="coupleBearTitle">
        <div class="couple-bear-heading">
          <span class="couple-bear-sparkle" aria-hidden="true">✦</span>
          <div><small>A LITTLE PLAYTIME</small><h3 id="coupleBearTitle">Bear Hugs</h3><p>Choose how our little bears show their love.</p></div>
          <span class="couple-bear-sparkle" aria-hidden="true">♡</span>
        </div>
        <div class="couple-bears-scene bear-pose-scene" data-action="idle" data-viewer-gender="${esc(me?.gender || '')}" aria-label="Daddy, the brown bear, and Mommy, the white bear">
          <svg id="bearPoseSvg" viewBox="90 120 420 270" role="img" aria-label="Daddy and Mommy, two animated bears showing affection through movement">
            <title>Daddy and Mommy Bear Hugs</title>
          </svg>
        </div>
        <p class="couple-bear-status" id="coupleBearStatus" aria-live="polite">Two little bears, one big love.</p>
        <div class="couple-bear-actions" role="group" aria-label="Choose a bear action">
          <button type="button" class="bear-action-button" data-couple-action="hug" aria-pressed="false"><span aria-hidden="true">🫂</span><b>Hug</b></button>
          <button type="button" class="bear-action-button" data-couple-action="kiss" aria-pressed="false"><span aria-hidden="true">💋</span><b>Kiss</b></button>
          <button type="button" class="bear-action-button" data-couple-action="flykiss" aria-pressed="false"><span aria-hidden="true">😘</span><b>Flying kiss</b></button>
          <button type="button" class="bear-action-button" data-couple-action="slap" aria-pressed="false"><span aria-hidden="true">🖐️</span><b>Playful slap</b></button>
          <button type="button" class="bear-action-button" data-couple-action="hands" aria-pressed="false"><span aria-hidden="true">🤝</span><b>Hold hands</b></button>
          <button type="button" class="bear-action-button" data-couple-action="dance" aria-pressed="false"><span aria-hidden="true">💃</span><b>Dance</b></button>
          <button type="button" class="bear-action-button" data-couple-action="pet" aria-pressed="false"><span aria-hidden="true">🐾</span><b>Pet</b></button>
          <button type="button" class="bear-action-button" data-couple-action="tummy" aria-pressed="false"><span aria-hidden="true">🫳</span><b>Scratch tummy</b></button>
          <button type="button" class="bear-action-button" data-couple-action="feed" aria-pressed="false"><span aria-hidden="true">🍓</span><b>Feed</b></button>
          <button type="button" class="bear-action-button" data-couple-action="sleep" aria-pressed="false"><span aria-hidden="true">🌙</span><b>Sleep</b></button>
          <button type="button" class="bear-action-button" data-couple-action="idle" aria-pressed="false"><span aria-hidden="true">🌸</span><b>Relax</b></button>
        </div>
        <div class="couple-bear-footer">
          <div class="bear-love-meter" role="group" aria-label="Little love meter">
            <div class="bear-love-meter-copy"><span>Little love meter</span><b id="bearLoveCount">0 hugs of happiness</b></div>
            <div class="bear-love-track"><span id="bearLoveFill"></span></div>
          </div>
        </div>
      </section>
    `;
    initBearPoseEngine();
  } else if (page === 'gallery') {
    c.innerHTML = `
      <div class="heading"><h2>Photo garden 🌷</h2><p>Little snapshots, shared with your friend.</p></div>
      <label class="primary upload-label">＋ Add photo<input data-upload="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>
      <section class="photo-garden-grid" aria-label="Shared photo garden">${pics.map(memoryCard).join('') || '<div class="empty">Your garden is waiting for its first photo ♡</div>'}</section>
      ${historySentinelMarkup('bottom')}
    `;
  } else if (page === 'music') {
    c.innerHTML = `
      <div class="heading"><h2>Cozy music 🎵</h2><p>Your songs play right here in the garden.</p></div>
      <label class="primary upload-label">＋ Add a song<input data-upload="song" type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm" hidden></label>
      <h3 class="shared-songs-title">Your shared songs</h3>
      <div class="grid media-grid music-grid">${songs.map(memoryCard).join('') || '<div class="empty">Add a song file and listen together right here ♡'}</div>
      ${historySentinelMarkup('bottom')}
    `;
  } else if (page === 'friends') {
    c.innerHTML = [
      '<div class="heading"><h2>Your little circle 🐰</h2><p>Your profile and the friends in your circle.</p></div>',
      '<section class="friend-search-section" aria-label="Find friends"><form class="friend-search-bar" id="friendSearchForm"><label class="friend-search-input-wrap"><span class="friend-search-icon" aria-hidden="true">⌕</span><input id="friendSearch" type="search" maxlength="24" autocomplete="off" spellcheck="false" placeholder="Search by username..." value="' + esc(friendQuery) + '" aria-label="Search friends by username"></label><button type="submit" id="searchFriends" class="primary">Search</button></form>',
      friendResults.length ? '<div class="friend-search-results"><div class="friend-section-title"><h3>Search results</h3><span>' + friendResults.length + '</span></div>' + friendResults.filter(user => !friends.some(friend => friend.username === user.username)).map(user => friendRow(user, false)).join('') + '</div>' : '',
      '</section>',
      '<section class="own-profile-section"><div class="friend-section-title"><h3>Your profile</h3></div>',
      me ? friendRow(me, true) : '<div class="empty">Your profile is not available right now.</div>',
      '</section>',
      '<section class="following-list"><div class="friend-section-title"><h3>Your Friends</h3><span>' + friends.length + '</span></div>',
      friends.map(user => friendRow(user, false)).join('') || '<div class="empty">Your circle is waiting for its first friend ♡</div>',
      '</section>'
    ].join('');
  }
  hydrateMedia();
  observeNotificationMemoryViews();
  requestAnimationFrame(observeFeedHistory);
}

function formatFriendProfileActivity(value) {
  if (!value) return 'Activity unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Activity unavailable';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Last active just now';
  if (minutes < 60) return 'Last active ' + minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return 'Last active ' + hours + 'hr ago';
  const days = Math.floor(hours / 24);
  if (days < 7) return 'Last active ' + days + 'day ago';
  const weeks = Math.floor(days / 7);
  return 'Last active ' + weeks + 'week ago';
}

function openClassicProfileEditor() {
  if (!me) return;
  const gate = $('#profileGate');
  if (!gate) return;
  $('#profileDisplay').value = me.displayName || me.display_name || '';
  $('#profileUsername').value = me.username || '';
  $('#profileBio').value = me.bio || '';
  $('#profileTheme').value = me.theme || 'rose';
  $('#profileMascot').value = me.mascot || '🐰';
  setTheme(me.theme || 'rose');
  updateThemePreview(me.theme || 'rose');
  updateBuddyChoices(me.mascot || '🐰');
  document.querySelectorAll('[data-classic-gender]').forEach(button => {
    const selected = button.dataset.classicGender === (me.gender || '');
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  gate.dataset.returnToOwnProfile = 'true';
  $('#friendProfileGate')?.classList.add('hidden');
  gate.classList.remove('hidden');
  document.body.classList.add('classic-profile-open');
  gate.scrollTop = 0;
}
function closeClassicProfileEditor() {
  const gate = $('#profileGate');
  if (!gate) return;
  const returnToProfile = gate.dataset.returnToOwnProfile === 'true';
  gate.classList.add('hidden');
  gate.dataset.returnToOwnProfile = 'false';
  document.body.classList.remove('classic-profile-open');
  if (returnToProfile && me) showFriendProfile(me);
}

function showFriendProfile(user) {
  if (!user) return;
  const gate = $('#friendProfileGate');
  gate.dataset.collectionUserId = String(user.id || '');
  friendGardenRequestSequence += 1;
  const isOwnProfile = !!(me?.id && user?.id && String(user.id) === String(me.id)) || (!!me?.username && String(user?.username || '').toLowerCase() === String(me.username).toLowerCase());
  gate.dataset.username = user.username;
  gate.dataset.following = String(!!user.isFollowing);
  gate.dataset.ownProfile = String(isOwnProfile);
  const wallpaper = ['normal', 'blossom', 'clouds', 'starlight', 'hearts'].includes(user.profile_wallpaper) ? user.profile_wallpaper : 'normal';
  gate.dataset.ownProfile = String(isOwnProfile);
  gate.classList.toggle('is-own-profile', isOwnProfile);
  const profileCard = gate.querySelector('.friend-profile-card');
  if (profileCard) {
    profileCard.dataset.wallpaper = wallpaper;
    profileCard.classList.toggle('is-own-profile', isOwnProfile);
  }
  $('#friendProfileBuddy').textContent = user.mascot || '🐰';
  $('#friendProfileName').textContent = user.displayName || user.display_name || user.username;
  $('#friendProfileHandle').textContent = '@' + user.username;
  const joinedAt = user.created_at || user.createdAt || user.followedAt;
  const joinedDate = $('#friendProfileJoined');
  if (joinedDate) {
    joinedDate.textContent = formatJoinDate(joinedAt);
    joinedDate.dateTime = joinedAt || '';
  }
  $('#friendProfileBio').textContent = user.bio || 'A little mystery friend ♡';
  const titleTag = $('#friendProfileTitleTag');
  if (titleTag) { const title = user.gender === 'male' ? 'King' : user.gender === 'female' ? 'Queen' : ''; titleTag.hidden = !title; titleTag.innerHTML = title ? '👑 <b>' + title + '</b>' : ''; }
  const settingsPanel = $('#profileSettingsPanel');
  if (settingsPanel && !isOwnProfile) settingsPanel.classList.add('hidden');
  const profileOnline = isPresenceUserOnline(user.id, (() => { try { return presenceChannel?.presenceState?.() || {}; } catch { return {}; } })());
  const presenceDot = $('#friendProfilePresenceDot');
  $('#friendProfilePresence').textContent = profileOnline ? 'Active now' :
    presenceStatus === 'ready' ? formatFriendProfileActivity(user.last_active_at) : 'Checking activity…';
  presenceDot?.classList.toggle('is-online', profileOnline);
  presenceDot?.classList.toggle('is-offline', !profileOnline);
  presenceDot?.setAttribute('aria-label', profileOnline ? 'Online' : 'Offline');
  $('#friendProfileHearts').textContent = user.heartCount === null || user.heartCount === undefined
    ? '— heart'
    : Number(user.heartCount).toLocaleString() + ' heart';
  const friendGarden = streakFriendSnapshot(user);
  $('#friendProfileStreakCount').textContent = friendGarden.count === null
    ? '— flower'
    : Number(friendGarden.count).toLocaleString() + ' flower';
  const highlights = $('#friendProfileHighlights');
  const collectionPanel = $('#friendProfileCollection');
  const badgesPanel = $('#friendProfileBadges');
  if (highlights) highlights.hidden = false;
  if (collectionPanel) collectionPanel.hidden = false;
  if (badgesPanel) badgesPanel.hidden = false;
  {
    const profileFeed = isOwnProfile ? (Array.isArray(feed) ? feed : []) : [];
    const photosPublic = Number(user.photo_count ?? user.photos_count ?? 0) || profileFeed.filter(item => item.kind === 'photo').length;
    const notesPublic = Number(user.note_count ?? user.notes_count ?? 0) || profileFeed.filter(item => item.kind === 'note').length;
    const songsPublic = Number(user.song_count ?? user.songs_count ?? 0) || profileFeed.filter(item => item.kind === 'song').length;
    const petalsPublic = isOwnProfile && typeof petalRewardBalance === 'function' ? petalRewardBalance() : Number(user.petals ?? user.petal_points ?? 0);
    [['friendProfilePhotos',photosPublic],['friendProfileNotes',notesPublic],['friendProfileSongs',songsPublic],['friendProfilePetals',petalsPublic]].forEach(([id,value]) => { const node=$('#'+id); if(node) node.textContent=Number(value).toLocaleString(); });
  }
  {
    const ownFeed = isOwnProfile && Array.isArray(feed) ? feed : [];
    const photos = isOwnProfile ? ownFeed.filter(item => item.kind === 'photo').length : Number(user.photo_count ?? user.photos_count ?? 0);
    const notes = isOwnProfile ? ownFeed.filter(item => item.kind === 'note').length : Number(user.note_count ?? user.notes_count ?? 0);
    const songs = isOwnProfile ? ownFeed.filter(item => item.kind === 'song').length : Number(user.song_count ?? user.songs_count ?? 0);
    if (isOwnProfile) {
      const collection = normalizeGardenCollection(readGardenCollection());
      renderFriendGardenCollection(collection, user.id, true);
      syncGardenCollectionToCloud(collection);
    } else {
      const collectionSection = $('#friendProfileCollection');
      const collectionItems = $('#friendProfileCollectionItems');
      const collectionCount = $('#friendProfileCollectionCount');
      let cachedCollection = null;
      try {
        const cached = localStorage.getItem(friendGardenCollectionCacheKey(user.id));
        if (cached) cachedCollection = normalizeGardenCollection(JSON.parse(cached));
      } catch {}
      if (cachedCollection) {
        renderFriendGardenCollection(cachedCollection, user.id, false);
      } else {
        if (collectionSection) collectionSection.hidden = false;
        if (collectionItems) collectionItems.innerHTML = '';
        if (collectionCount) collectionCount.hidden = true;
      }
      loadFriendGardenCollection(user, false);
    }
    const streak = Math.max(0, Number(user.login_streak) || 0);
    const heartTotal = Math.max(0, Number(user.heartCount) || 0);
  const flowerMilestones = [
    {goal:3, icon:'🌱', title:'Tiny sprout'},
    {goal:7, icon:'🌼', title:'First flower'},
    {goal:14, icon:'🌷', title:'Little garden'},
    {goal:30, icon:'🌸', title:'Growing plant'},
    {goal:50, icon:'💐', title:'Golden bouquet'},
    {goal:100, icon:'🌟', title:'Blooming garden'},
    {goal:180, icon:'🏵️', title:'Magical garden'},
    {goal:365, icon:'💮', title:'Eternal garden'}
  ];
    const heartMilestones = [
    {goal:10, title:'Little Keepsake', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M13 25 36 13l23 12v27H13Z" fill="#f5d9e4" stroke="#c98da8" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 24h52v8H10z" fill="#e8b9cb" stroke="#c98da8" stroke-width="2"/><path d="M29 23c0-8 14-8 14 0-1 5-7 8-7 8s-6-3-7-8Z" fill="#d77e9e"/><path d="M36 32v20" stroke="#c98da8" stroke-width="2"/><path d="m23 18 5-5m16 5 5-5" stroke="#fff8f4" stroke-width="2" stroke-linecap="round"/></svg>'},
    {goal:100, title:'Sweet Letter', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><rect x="10" y="17" width="52" height="36" rx="7" fill="#fff0e8" stroke="#c98da8" stroke-width="2.2"/><path d="m12 22 24 19 24-19" fill="none" stroke="#d89bb2" stroke-width="2.5" stroke-linecap="round"/><path d="M28 13c0-6 9-7 9 0 0-7 10-6 9 0-1 5-9 10-9 10s-8-5-9-10Z" fill="#d77e9e"/><path d="M19 47h15m-15-5h9" stroke="#d8b4c2" stroke-width="2" stroke-linecap="round"/></svg>'},
    {goal:250, title:'Blushing Bouquet', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M22 30 36 55 50 30" fill="#d9e7ce" stroke="#91aa82" stroke-width="2"/><path d="M36 53V29M36 43 24 34M36 40l12-10" stroke="#91aa82" stroke-width="2.5" stroke-linecap="round"/><g fill="#f4c5d5" stroke="#c98da8" stroke-width="1.5"><circle cx="23" cy="20" r="7"/><circle cx="36" cy="13" r="7"/><circle cx="49" cy="20" r="7"/></g><g fill="#e6a1b9"><circle cx="23" cy="20" r="2.5"/><circle cx="36" cy="13" r="2.5"/><circle cx="49" cy="20" r="2.5"/></g><path d="m22 45 14 10 14-10" fill="none" stroke="#c98da8" stroke-width="3" stroke-linecap="round"/></svg>'},
    {goal:500, title:'Golden Treasure', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="m36 8 7 8 12-1-2 12 8 9-10 7-3 12-12-4-12 4-3-12-10-7 8-9-2-12 12 1Z" fill="#f7e8b8" stroke="#c7a45f" stroke-width="2"/><path d="m36 19 12 11-12 17-12-17Z" fill="#e8a4ba" stroke="#bd7895" stroke-width="2"/><path d="m24 30 12 4 12-4M36 34v13" fill="none" stroke="#fff4e7" stroke-width="2"/><circle cx="36" cy="28" r="3" fill="#fff5d9"/></svg>'},
    {goal:750, title:'Love Guardian', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="m13 27 6-14 12 8 5-12 5 12 12-8 6 14-9 24H22Z" fill="#e9dff4" stroke="#a58bb8" stroke-width="2" stroke-linejoin="round"/><path d="M25 31c0-7 10-8 11 0 2-8 12-7 12 0-1 7-12 15-12 15S26 38 25 31Z" fill="#d77e9e" stroke="#bd7895" stroke-width="1.4"/><circle cx="19" cy="17" r="2" fill="#d7b56e"/><circle cx="53" cy="17" r="2" fill="#d7b56e"/><path d="M18 48q-5 5-1 9m37-9q5 5 1 9" fill="none" stroke="#a58bb8" stroke-width="2" stroke-linecap="round"/></svg>'},
    {goal:1000, title:'Everlasting Love', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><circle cx="36" cy="32" r="25" fill="#fff0e7" stroke="#d5a2b5" stroke-width="2"/><circle cx="36" cy="32" r="20" fill="none" stroke="#e6c1ce" stroke-width="1.5" stroke-dasharray="2 3"/><path d="M24 29c0-9 12-10 12 0 1-10 13-9 13 0-1 9-13 18-13 18S25 38 24 29Z" fill="#d77e9e" stroke="#bd7895" stroke-width="1.5"/><path d="m16 12 3 4 5 1-5 2-3 5-2-5-5-2 5-1Zm40-2 2 4 4 2-4 1-2 4-2-4-4-1 4-2Z" fill="#d6b66f"/><path d="M15 39q-5-5-7 0m49 0q5-5 7 0" fill="none" stroke="#91aa82" stroke-width="2" stroke-linecap="round"/></svg>'}
  ];
    const milestoneBadges = (items,total,unit) => items.filter(item => total >= item.goal).map(item => {
      const art = unit === 'days' ? STREAK_MILESTONE_ILLUSTRATIONS[items.indexOf(item)] : item.icon;
      return '<span class="friend-profile-milestone-badge is-unlocked" title="'+esc(item.title+' · '+item.goal.toLocaleString()+' '+unit)+'" aria-label="'+esc(item.title+' · '+item.goal.toLocaleString()+' '+unit+' · Unlocked')+'">'+(typeof art === 'string' && art.trim().startsWith('<svg') ? '<span class="friend-profile-milestone-svg">'+art+'</span>' : '<span class="friend-profile-milestone-emoji">'+art+'</span>')+'</span>';
    }).join('');
    const badgeList = $('#friendProfileBadgeList');
    if (badgeList) badgeList.innerHTML =
      '<div class="friend-profile-milestone-icons" aria-label="Achievement badge collection">'+
      milestoneBadges(flowerMilestones,streak,'days')+
      milestoneBadges(heartMilestones,heartTotal,'hearts')+
      '</div>';
  }
  $('#friendProfileFollow').innerHTML = '<span aria-hidden="true">✿</span>';
  $('#friendProfileFollow').disabled = !isOwnProfile;
  $('#friendProfileFollow').setAttribute('aria-label', isOwnProfile ? 'Change profile wallpaper' : 'Decorative flower');
  $('#friendProfileFollow').title = isOwnProfile ? 'Change profile wallpaper' : '';
  $('#friendProfileFollow').dataset.themeAction = isOwnProfile ? 'true' : 'false';
  $('#friendProfileFollow').dataset.decorative = isOwnProfile ? 'false' : 'true';
  $('#friendProfileFollow').classList.toggle('is-following', !!user.isFollowing);
  $('#friendProfileFollow').classList.toggle('is-own-profile', isOwnProfile);
  gate.classList.remove('hidden');
}


// Keep the Settings panel and its flower trigger in sync when dismissed.
function restoreProfileSettingsToMain() {
  const panel = $('#profileSettingsPanel');
  if (panel) panel.classList.add('hidden');
  const trigger = $('#profileSettingsTrigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function profileSettingsMarkup() {
  const themeOptions = [
    ['rose','🌷','Rose garden'],['lavender','☁️','Lavender skies'],['mint','🍃','Mint meadow'],
    ['sky','🐦','Bluebird day'],['peach','🍑','Peach glow'],['berry','🫐','Berry bloom'],
    ['midnight','🌙','Midnight lilac'],['sage','🌿','Sage garden'],['buttercup','🌼','Buttercup']
  ];
  const buddyOptions = [['🐰','Bunny'],['🐱','Kitty'],['🐻','Bear'],['🐸','Frog']];
  return `<section class="profile-settings-panel hidden" id="profileSettingsPanel" aria-label="Settings" aria-modal="false">
    <div class="profile-settings-heading">
      <div><small>YOUR LITTLE CORNER</small><h3>Settings</h3><p>Make this space feel like yours.</p></div>
      <button type="button" class="profile-settings-close" id="profileSettingsClose" aria-label="Close profile settings">×</button>
    </div>
    <div class="profile-settings-tabs" role="tablist" aria-label="Settings sections">
      <button type="button" class="profile-settings-tab is-active" data-settings-tab="account" role="tab" aria-selected="true" aria-controls="profileSettingsAccount">Account</button>
      <button type="button" class="profile-settings-tab" data-settings-tab="personal" role="tab" aria-selected="false" aria-controls="profileSettingsPersonal">Personal</button>
      <button type="button" class="profile-settings-tab" data-settings-tab="appearance" role="tab" aria-selected="false" aria-controls="profileSettingsAppearance">Appearance</button>
      <button type="button" class="profile-settings-tab" data-settings-tab="notifications" role="tab" aria-selected="false" aria-controls="profileSettingsNotifications">Alerts</button>
    </div>
    <div class="profile-settings-section profile-editor-settings" id="profileSettingsAccount" data-settings-section="account" role="tabpanel">
      <div class="settings-section-intro"><span class="settings-section-icon">♡</span><div><b>About you</b><small>Write a little introduction.</small></div></div>
      <label class="profile-settings-field">A little about you
        <textarea id="profileEditBio" maxlength="180" rows="3" placeholder="Write a little introduction..."></textarea>
        <small class="profile-bio-count" id="profileBioCount">0 / 180</small>
      </label>
    </div>
    <div class="profile-settings-section profile-editor-settings hidden" id="profileSettingsPersonal" data-settings-section="personal" role="tabpanel">
      <div class="settings-section-intro"><span class="settings-section-icon">✿</span><div><b>About you</b><small>Personalize how your profile is represented.</small></div></div>
      <div class="profile-settings-gender">
        <label>Gender</label>
        <div class="profile-gender-options" role="group" aria-label="Choose your gender">
          <button type="button" data-profile-gender="male" aria-pressed="false">Male</button>
          <button type="button" data-profile-gender="female" aria-pressed="false">Female</button>
        </div>
      </div>
    </div>
    <div class="profile-settings-section profile-editor-settings hidden" id="profileSettingsAppearance" data-settings-section="appearance" role="tabpanel">
      <div class="settings-section-intro"><span class="settings-section-icon">✧</span><div><b>Your appearance</b><small>Choose the colours and little buddy you love.</small></div></div>
      <input id="settingsThemeValue" type="hidden" value="rose">
      <div class="settings-choice-heading">Colour theme</div>
      <div class="settings-theme-grid" role="radiogroup" aria-label="Choose a colour theme">
        ${themeOptions.map(([value,emoji,label]) => `<button type="button" class="settings-theme-choice theme-${value}" data-settings-theme-choice="${value}" role="radio" aria-checked="false"><span class="theme-illustration" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M20 5c3 0 4 5 4 8 3-3 7-5 9-3s0 7-3 9c4 0 8 2 8 5s-5 4-8 4c3 3 4 7 2 9s-7 0-9-3c0 4-2 7-5 7s-4-5-4-8c-3 3-7 4-9 2s0-7 3-9c-4 0-7-2-7-5s5-4 8-4c-3-3-4-7-2-9s7 0 9 3c0-4 2-6 4-6Z" fill="currentColor" opacity=".78"/><circle cx="20" cy="22" r="5" fill="#fff6e9" stroke="currentColor" stroke-width="1.5"/></svg></span><small>${label}</small></button>`).join('')}
      </div>
      <input id="settingsBuddyValue" type="hidden" value="🐰">
      <div class="settings-choice-heading">Little buddy</div>
      <div class="settings-buddy-row" role="radiogroup" aria-label="Choose your little buddy">
        ${buddyOptions.map(([value,label]) => `<button type="button" class="settings-buddy-choice" data-settings-buddy-choice="${value}" role="radio" aria-checked="false"><span class="buddy-choice-art">${buddyIllustration(value)}</span><small>${label}</small></button>`).join('')}
      </div>
      <button type="button" class="settings-wallpaper-action" id="profileSettingsWallpaper">Change profile wallpaper <span>→</span></button>
    </div>
    <div class="profile-settings-section profile-editor-settings hidden" id="profileSettingsNotifications" data-settings-section="notifications" role="tabpanel">
      <div class="settings-section-intro"><span class="settings-section-icon">♡</span><div><b>Your notifications</b><small>Choose what you want to hear about.</small></div></div>
      <div class="settings-notification-card"><span>Photos, songs & notes</span><small>Updates shared in your little corner</small><button type="button" class="settings-open-notifications" id="profileSettingsOpenNotifications">Manage alerts →</button></div>
    </div>
    <div class="profile-settings-actions">
      <p class="profile-settings-feedback" id="profileSettingsFeedback" role="status" aria-live="polite"></p>
      <button type="button" class="primary profile-settings-save" id="profileSettingsSave"><span aria-hidden="true">♡</span> Save settings</button>
    </div>
  </section>`;
}
function buddyIllustration(value) {
  const icons = { '🐰':'bunny', '🐱':'kitty', '🐻':'bear', '🐸':'frog' };
  const icon = icons[value] || 'bunny';
  return '<svg class="cb-buddy-illustration" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><use href="#cb-icon-' + icon + '"></use></svg>';
}

function updateProfileLivePreview() {
  const count = $('#profileBioCount'), bio = $('#profileEditBio');
  if (count) count.textContent = (bio?.value || '').length + ' / 180';
}
function renderProfileSettings() {
  const bioField = $('#profileEditBio');
  if (bioField) bioField.value = me?.bio || '';
  updateProfileLivePreview();
  const gender = me?.gender || '';
  const theme = me?.theme || 'rose';
  const buddy = me?.mascot || '🐰';
  const themeInput = $('#settingsThemeValue'), buddyInput = $('#settingsBuddyValue');
  if (themeInput) themeInput.value = theme;
  if (buddyInput) buddyInput.value = buddy;
  document.querySelectorAll('[data-settings-theme-choice]').forEach(button => {
    const selected = button.dataset.settingsThemeChoice === theme;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', String(selected));
  });
  document.querySelectorAll('[data-settings-buddy-choice]').forEach(button => {
    const selected = button.dataset.settingsBuddyChoice === buddy;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', String(selected));
  });
  document.querySelectorAll('[data-profile-gender]').forEach(button => {
    const selected = button.dataset.profileGender === gender;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  syncBearViewerRole();
}
async function saveProfileSettings() {
  if (!me?.id) return;
  const save = $('#profileSettingsSave'), feedback = $('#profileSettingsFeedback');
  const gender = document.querySelector('[data-profile-gender].is-selected')?.dataset.profileGender || null;
  const username = me.username || '';
  if (save) save.disabled = true;
  if (feedback) feedback.textContent = 'Saving your changes…';
  try {
    const theme = $('#settingsThemeValue')?.value || me.theme || 'rose';
    const mascot = $('#settingsBuddyValue')?.value || me.mascot || '🐰';
    const displayName = me.displayName || me.display_name || '';
    const bio = String($('#profileEditBio')?.value || '').trim().slice(0,180);
    const saved = await api('/me', { method: 'PUT', body: JSON.stringify({ username, gender, theme, mascot, displayName, bio }) });
    me = { ...me, ...saved, username: saved.username || username, gender, theme, mascot, displayName: saved.displayName ?? displayName, display_name: saved.display_name ?? displayName, bio };
    setTheme(theme);
    const topMascot = $('#topMascot');
    if (topMascot) topMascot.textContent = mascot;
    const gate = $('#friendProfileGate');
    if (gate && !gate.classList.contains('hidden') && gate.dataset.ownProfile === 'true') showFriendProfile(me);
    renderProfileSettings();
    if (feedback) feedback.textContent = 'Settings saved ♡';
    toast('Settings saved ♡');
    restoreProfileSettingsToMain();
    render();
  } catch (error) {
    if (feedback) feedback.textContent = error.message || 'Could not save your profile.';
    toast(error.message || 'Could not save your profile.');
  } finally {
    if (save) save.disabled = false;
  }
}

const PROFILE_WALLPAPERS = ['normal', 'blossom', 'clouds', 'starlight', 'hearts'];
const PROFILE_WALLPAPER_LABELS = { normal: 'Normal', blossom: 'Blossom Garden', clouds: 'Cloud Nook', starlight: 'Starlight', hearts: 'Heart Garden' };

async function cycleProfileWallpaper() {
  if (!me?.id) return;
  const current = PROFILE_WALLPAPERS.includes(me.profile_wallpaper) ? me.profile_wallpaper : 'normal';
  const next = PROFILE_WALLPAPERS[(PROFILE_WALLPAPERS.indexOf(current) + 1) % PROFILE_WALLPAPERS.length];
  const button = $('#friendProfileFollow');
  if (button) button.disabled = true;
  try {
    const saved = await api('/profile-wallpaper', { method: 'PUT', body: JSON.stringify({ wallpaper: next }) });
    me = { ...me, profile_wallpaper: saved.profile_wallpaper || next };
    const card = $('#friendProfileGate .friend-profile-card');
    if (card) card.dataset.wallpaper = me.profile_wallpaper;
    const ownRow = document.querySelector('#content .own-profile-row');
    if (ownRow) ownRow.dataset.wallpaper = me.profile_wallpaper;
    if (button) button.innerHTML = '<span aria-hidden="true">✿</span>';
    toast('Wallpaper: ' + (PROFILE_WALLPAPER_LABELS[me.profile_wallpaper] || 'Normal') + ' ♡');
  } catch (error) {
    toast(error.message || 'Could not save wallpaper.');
  } finally {
    if (button) button.disabled = false;
  }
}

async function toggleFriendFollow(username, isFollowing) {
  if (!username || username === me?.username) return;
  const beforeFriends = friends.slice(), beforeResults = friendResults.slice();
  const found = [...friends, ...friendResults].find(user => user.username === username) || { username, displayName: username, mascot: '🐰' };
  const next = !isFollowing;
  friends = next ? [...friends.filter(user => user.username !== username), { ...found, isFollowing: true }] : friends.filter(user => user.username !== username);
  friendResults = friendResults.map(user => user.username === username ? { ...user, isFollowing: next } : user);
  const gate = $('#friendProfileGate');
  if (gate.dataset.username === username) {
    gate.dataset.following = String(next);
    $('#friendProfileFollow').textContent = next ? 'Following' : 'Follow ♡';
    $('#friendProfileFollow').classList.toggle('is-following', next);
  }
  render();
  try {
    await api('/follow/' + encodeURIComponent(username), { method: next ? 'POST' : 'DELETE' });
    toast(next ? 'You’re following this friend ♡' : 'Friend removed from your circle');
    void refresh().catch(() => {});
  } catch (error) {
    friends = beforeFriends;
    friendResults = beforeResults;
    if (gate.dataset.username === username) {
      gate.dataset.following = String(isFollowing);
      $('#friendProfileFollow').textContent = isFollowing ? 'Following' : 'Follow ♡';
      $('#friendProfileFollow').classList.toggle('is-following', isFollowing);
    }
    render();
    toast(error.message);
  }
}

function updateBuddyChoices(value = $('#profileMascot')?.value || '🐰') {
  document.querySelectorAll('[data-buddy-choice]').forEach(button => {
    const selected = button.dataset.buddyChoice === value;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', String(selected));
  });
}

function updateThemePreview(theme = $('#profileTheme')?.value || 'rose') {
  // Apply the selected palette to the entire app immediately while Settings is open.
  setTheme(theme);
  const preview = $('#profileThemePreview');
  if (preview) preview.dataset.themePreview = theme;
  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    const selected = button.dataset.themeChoice === theme;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', String(selected));
  });
  const buddy = $('#profileMascot')?.value || '🐰', avatar = $('#profileThemeBuddy');
  if (avatar) avatar.textContent = buddy;
  const name = $('#profilePreviewName');
  if (name) name.textContent = $('#profileDisplay')?.value.trim() || me?.displayName || 'Your cozy style';
  const meta = $('#profilePreviewMeta');
  if (meta) meta.textContent = `@${($('#profileUsername')?.value.trim().toLowerCase() || me?.username || 'your_name')} · ${themeNames[theme] || themeNames.rose}`;
  updateBuddyChoices(buddy);
}

/* Audio Player */
function formatClock(value) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const minutes = Math.floor(value / 60), seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function shortIslandTitle(track) {
  const name = String(track?.fileName || track?.text || 'Song').replace(/\.[^.]{1,8}$/, '').trim();
  return Array.from(name || 'Song').slice(0, 5).join('');
}

function toggleMusicIsland(force) {
  const panel = $('#nowPlayingPanel'), pill = $('#nowPlayingPill'), track = playlist[playlistIndex];
  if (!panel) return;
  if (!track && force !== false) return;
  const open = typeof force === 'boolean' ? force : panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !open);
  pill?.setAttribute('aria-expanded', String(open));
}

function syncPlayer() {
  const audio = $('#globalAudio');
  if (!audio) return;
  audio.preload = 'auto';
  document.querySelectorAll('[data-play-song]').forEach(button => {
    const active = String(playlist[playlistIndex]?.id) === String(button.dataset.playSong) && !audio.paused && !audio.ended;
    button.classList.toggle('is-playing', active);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? 'Pause song' : 'Play song');
  });
  const track = playlist[playlistIndex], hasTrack = !!track && !!audio.src, playing = hasTrack && !audio.paused && !audio.ended;
  const island = $('#nowPlayingIsland'), pill = $('#nowPlayingPill'), shortTitle = $('#islandShortTitle'), fullTitle = $('#islandFullTitle');
  const status = $('#islandStatusText'), toggle = $('#nowPlayingToggle'), seek = $('#islandSeek'), current = $('#islandCurrentTime'), duration = $('#islandDuration');
  if (island) {
    island.classList.toggle('hidden', !hasTrack);
    island.classList.toggle('is-playing', playing);
  }
  $('#app').classList.toggle('has-now-playing', hasTrack);
  if (!hasTrack) toggleMusicIsland(false);
  if (track) {
    const title = track.fileName || track.text || 'A little song';
    const songAuthor = track.author || {};
    const currentStatus = String(songAuthor.displayName || songAuthor.display_name || songAuthor.username || 'Unknown user').trim() || 'Unknown user';
    const userPet = $('#islandPetIcon');
    if (userPet) userPet.textContent = String(songAuthor.mascot || '🐰');
    if (shortTitle) shortTitle.textContent = shortIslandTitle(track);
    if (fullTitle) fullTitle.textContent = title;
    if (status) status.textContent = currentStatus;
    if (pill) {
      pill.title = title + ' · ' + currentStatus;
      pill.setAttribute('aria-label', 'Music: ' + title + '. Status: ' + currentStatus + '. Open player');
    }
  }
  if (toggle) {
    toggle.textContent = audio.paused ? '▶' : 'Ⅱ';
    toggle.setAttribute('aria-label', audio.paused ? 'Play song' : 'Pause song');
  }
  if (seek) seek.value = audio.duration ? String(Math.round(audio.currentTime / audio.duration * 1000)) : 0;
  if (current) current.textContent = formatClock(audio.currentTime);
  if (duration) duration.textContent = formatClock(audio.duration);
}

async function resolveSongSource(track) {
  const key = String(track.id);
  const cached = songUrlCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 30000) return cached.url;
  if (songUrlInFlight.has(key)) return songUrlInFlight.get(key);
  const request = sb.storage.from('memories').createSignedUrl(track.storagePath, 3600)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) throw error || new Error('The song file could not be loaded.');
      const entry = { url: data.signedUrl, expiresAt: Date.now() + 3500000 };
      songUrlCache.set(key, entry);
      if (songUrlCache.size > 24) songUrlCache.delete(songUrlCache.keys().next().value);
      return entry.url;
    }).finally(() => songUrlInFlight.delete(key));
  songUrlInFlight.set(key, request);
  return request;
}

function warmSongSources(tracks) {
  tracks.forEach(track => {
    if (track?.storagePath) void resolveSongSource(track).catch(error => console.debug('Song prefetch deferred:', error?.message || error));
  });
}

async function playSong(id) {
  const songs = feed.filter(x => x.kind === 'song');
  const index = songs.findIndex(x => String(x.id) === String(id));
  const audio = $('#globalAudio');
  const requestId = ++songLoadSequence;
  if (index < 0) return toast('This song is no longer in your garden ♡');

  if (String(playlist[playlistIndex]?.id) === String(id) && audio.src) {
    if (audio.paused) await audio.play().catch(error => toast(error.message));
    else audio.pause();
    syncPlayer();
    return;
  }

  playlist = songs;
  playlistIndex = index;
  const track = songs[index];
  const playButton = [...document.querySelectorAll("[data-play-song]")].find(button => String(button.dataset.playSong) === String(id));
  playButton?.classList.add("is-loading");
  playButton?.classList.remove("is-buffering");
  // Keep the current player and audio element alive while the next signed URL
  // is resolved; the previous song continues instead of flashing to empty.
  syncPlayer();
  try {
    const url = await resolveSongSource(track);
    if (requestId !== songLoadSequence) return;
    audio.src = url;
    audio.preload = 'auto';
    playButton?.classList.remove("is-loading");
    playButton?.classList.add("is-buffering");
    const playback = audio.play();
    syncPlayer();
    await playback;
    if (requestId !== songLoadSequence) return;
    syncPlayer();
    playButton?.classList.remove("is-loading", "is-buffering");
  } catch (error) {
    if (requestId !== songLoadSequence) return;
    playButton?.classList.remove("is-loading", "is-buffering");
    syncPlayer();
    toast(error?.message || 'Could not play this song right now ♡');
  }
}

function stepSong(step) {
  const songs = feed.filter(x => x.kind === 'song');
  if (!songs.length) {
    playlist = [];
    playlistIndex = -1;
    return;
  }
  const currentId = playlist[playlistIndex]?.id;
  const currentIndex = songs.findIndex(song => String(song.id) === String(currentId));
  const baseIndex = currentIndex < 0 ? (step > 0 ? -1 : 0) : currentIndex;
  const nextIndex = (baseIndex + step + songs.length) % songs.length;
  // Do not change playlistIndex here. playSong uses it to distinguish a
  // genuinely new track from the currently playing one.
  void playSong(songs[nextIndex].id);
}

/* Modals & Dialogs */
function closeAllGates() {
  closePhotoLightbox();
  closeMemoryActions();
  hideMessageActions();
  document.querySelectorAll('.auth-gate').forEach(gate => gate.classList.add('hidden'));
}

async function openPhotoLightbox(id) {
  const item = feed.find(memory => String(memory.id) === String(id));
  if (!item || item.kind !== 'photo') return;
  const gate = $('#photoLightbox'), image = $('#photoLightboxImage'), deleteButton = $('#photoLightboxDelete'), saveButton = $('#photoLightboxSave');
  const thumb = [...document.querySelectorAll('.feed-item[data-memory]')].find(node => node.dataset.memory === String(id))?.querySelector('.feed-photo');
  const isOwnPhoto = String(item.author?.id || item.owner_id || '') === String(me?.id || '');
  const canDelete = isOwnPhoto && !item.isPending;
  gate.dataset.memoryId = String(id);
  // Own photos never expose Save. While an upload is pending, show no action.
  deleteButton.classList.toggle('hidden', !canDelete);
  deleteButton.setAttribute('aria-hidden', String(!canDelete));
  saveButton.classList.toggle('hidden', isOwnPhoto);
  saveButton.setAttribute('aria-hidden', String(isOwnPhoto));
  // Reuse the already-rendered thumbnail immediately whenever possible.
  const visibleSource = thumb?.currentSrc || thumb?.getAttribute('src');
  if (visibleSource) image.src = visibleSource;
  else image.removeAttribute('src');
  gate.classList.remove('hidden');

  // Resolve directly through the shared cache rather than waiting for the
  // thumbnail observer. Cached photos appear immediately; uncached photos
  // start loading as soon as the viewer opens.
  if (!visibleSource && item.storagePath) {
    try {
      const source = await resolveMediaSource(item);
      if (gate.dataset.memoryId === String(id)) {
        image.src = source;
        if (thumb?.isConnected && !thumb.getAttribute('src')) thumb.src = source;
      }
    } catch (error) {
      console.warn('Photo preview could not be loaded:', error?.message || error);
    }
  }
}

function closePhotoLightbox() {
  const gate = $('#photoLightbox'), confirmGate = $('#photoDeleteConfirmGate');
  gate.classList.add('hidden');
  gate.dataset.memoryId = '';
  $('#photoLightboxImage').removeAttribute('src');
  $('#photoLightboxDelete').classList.add('hidden');
  confirmGate.classList.add('hidden');
  confirmGate.dataset.memoryId = '';
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
function showMessageActions(id, bubbleElement) {
  hideMessageActions();
  const memory = feed.find(m => String(m.id) === String(id));
  if (!memory || !bubbleElement) return;

  activeMessageActionsId = String(id);
  const ownsMessage = String(memory.author?.id || memory.owner_id || '') === String(me?.id || '');
  const popup = document.createElement('div');
  popup.className = 'chat-actions-popup';
  popup.setAttribute('role', 'toolbar');
  popup.setAttribute('aria-label', 'Message options');
  popup.innerHTML = `    <button type="button" class="chat-action-btn reply-btn" data-chat-reply="${esc(id)}">Reply</button>
    ${ownsMessage ? `<button type="button" class="chat-action-btn edit-btn" data-chat-edit="${esc(id)}">Edit</button>` : ''}
    <button type="button" class="chat-action-btn" data-chat-copy="${esc(id)}">Copy</button>
    <button type="button" class="chat-action-btn delete-btn" ${ownsMessage ? 'data-chat-delete' : 'data-chat-hide'}="${esc(id)}">Delete</button>
  `;
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
      await api('/memories/' + encodeURIComponent(id), { method: 'DELETE' });
      feed = feed.filter(m => String(m.id) !== String(id));
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

async function sendChatMessage() {
  const field = $('#chatInput');
  const text = field?.value.trim();
  if (!text) return;
  const replyId = replyingToMessageId;
  const tempId = 'local-note-' + Date.now();
  const createdAt = new Date().toISOString();
  const optimistic = {
    id: tempId,
    kind: 'note',
    text,
    reply_to_id: replyId ? Number(replyId) : null,
    createdAt,
    created_at: createdAt,
    isPending: true,
    author: { ...me, id: me?.id, displayName: me?.displayName || me?.username, mascot: me?.mascot || '🐰' }
  };

  stopNotesTyping();
  field.value = '';
  field.style.height = '';
  field.style.overflowY = 'hidden';
  feed = [optimistic, ...feed];
  hideMessageActions();
  renderNotesPage({ followLatest: true });

  const refocusComposer = (restoreDraft = false) => {
    const nextField = $('#chatInput');
    if (!nextField) return;
    if (restoreDraft && !nextField.value) nextField.value = text;
    nextField.focus({ preventScroll: true });
    syncChatComposerState(nextField);
    syncNotesKeyboardLayout();
  };
  refocusComposer();

  try {
    const { data: saved, error: sendError } = await sb.from('memories')
      .insert({ owner_id: me.id, kind: 'note', text, reply_to_id: replyId ? Number(replyId) : null })
      .select('id,owner_id,kind,text,created_at,reply_to_id,edited_at')
      .single();
    if (sendError) throw sendError;
    recordStreakNoteQuest(text);
    void loadKindnessEventStatus();
    if (replyingToMessageId === replyId) replyingToMessageId = null;
    const record = { ...saved, createdAt: saved.created_at, author: optimistic.author };
    feed = feed.map(m => String(m.id) === tempId ? record : m);
    renderNotesPage({ followLatest: true });
    refocusComposer();
  } catch (error) {
    feed = feed.filter(m => String(m.id) !== tempId);
    if (replyId) replyingToMessageId = replyId;
    renderNotesPage({ followLatest: true });
    refocusComposer(true);
    toast(error.message);
  }
}

function openNoteComposer() {
  const myLatestNote = feed.find(m => m.kind === 'note' && String(m.author?.id || m.owner_id) === String(me?.id));
  const input = $('#igNoteInput');
  const clearBtn = $('#igNoteClear');
  if (input) input.value = myLatestNote ? myLatestNote.text : '';
  if (clearBtn) clearBtn.classList.toggle('hidden', !myLatestNote);
  $('#noteComposerGate').classList.remove('hidden');
  input?.focus();
}

async function saveIgNote() {
  const input = $('#igNoteInput'), text = input?.value.trim();
  if (!text) return toast('Write a little thought first ♡');
  $('#noteComposerGate').classList.add('hidden');
  try {
    const saved = await api('/memories', { method: 'POST', body: JSON.stringify({ kind: 'note', text }) });
    recordStreakNoteQuest(text);
    const record = { ...saved, createdAt: saved.created_at, author: { ...me, displayName: me?.displayName || me?.username, mascot: me?.mascot || '🐰' } };
    feed = [record, ...feed];
    renderNotesPage({ followLatest: true });
    toast('Your note is updated ♡');
  } catch (err) {
    toast(err.message);
  }
}

async function clearIgNote() {
  const myLatestNote = feed.find(m => m.kind === 'note' && String(m.author?.id || m.owner_id) === String(me?.id));
  $('#noteComposerGate').classList.add('hidden');
  if (myLatestNote) {
    try {
      await api('/memories/' + encodeURIComponent(myLatestNote.id), { method: 'DELETE' });
      feed = feed.filter(m => String(m.id) !== String(myLatestNote.id));
      renderNotesPage();
      toast('Your note was cleared ♡');
    } catch (e) {
      toast(e.message);
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

async function sendNotesTyping(isTyping) {
  const nextState = !!isTyping && page === 'notes' && !document.hidden;
  if (!notesTypingChannel || !me) return;
  if (!notesTypingChannelReady) {
    notesTypingQueuedState = nextState;
    return;
  }
  try {
    const result = await notesTypingChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: String(me.id),
        username: me.username || 'Friend',
        display_name: me.displayName || me.display_name || me.username || 'Friend',
        is_typing: nextState,
        sent_at: Date.now()
      }
    });
    if (result !== 'ok') {
      notesTypingQueuedState = nextState;
      console.warn('Notes typing broadcast status:', result);
    }
  } catch (error) {
    notesTypingQueuedState = nextState;
    console.warn('Notes typing update could not be sent:', error?.message || error);
  }
}

function receiveNotesTyping(payload) {
  const userId = String(payload?.user_id || payload?.userId || payload?.profile_id || payload?.id || '');
  if (!userId || userId === String(me?.id || '')) return;

  // Broadcast membership is the source of truth here. A friend may not yet
  // exist in the local follow/feed cache, so filtering against those stale
  // lists can silently discard a valid typing event.
  const friend = friends.find(item => String(item.id || item.user_id || '') === userId);
  const knownAuthor = feed.find(item =>
    item.kind === 'note' &&
    String(item.author?.id || item.owner_id || '') === userId
  )?.author;

  // Do not compare a sender's wall clock with this device's clock.
  // Clock drift can make a valid friend's typing event look expired only to
  // one recipient. Expiry is handled locally from the moment the event arrives.
  const sentAt = Number(payload?.sent_at || 0);
  const existing = remoteTypingUsers.get(userId);
  // Ignore delayed packets so an older "stopped typing" event cannot erase
  // a newer active state after network jitter.
  if (existing?.lastSentAt && sentAt && sentAt < existing.lastSentAt) return;
  if (existing?.timer) clearTimeout(existing.timer);

  if (!payload.is_typing || page !== 'notes' || document.hidden) {
    remoteTypingUsers.delete(userId);
    syncNotesTypingIndicator();
    return;
  }

  const username = friend?.username || knownAuthor?.username || payload.username || 'Friend';
  const entry = {
    username,
    displayName: friend?.displayName || friend?.display_name ||
      knownAuthor?.displayName || knownAuthor?.display_name ||
      payload.display_name || username,
    presenceOnly: false,
    lastSentAt: sentAt || Date.now(),
    timer: setTimeout(() => {
      remoteTypingUsers.delete(userId);
      syncNotesTypingIndicator();
    }, NOTES_TYPING_EXPIRY_MS)
  };
  remoteTypingUsers.set(userId, entry);
  syncNotesTypingIndicator();
}

function updateNotesTypingPresence() {
  // Typing is Broadcast-only. Never call Presence.track() from typing handlers:
  // Supabase rate-limits Presence updates and closes the shared online channel.
}

function startNotesTyping() {
  if (!me || page !== 'notes' || document.hidden) return;
  const now = Date.now();
  if (!typingActive) {
    typingActive = true;
    typingLastSentAt = now;
    void sendNotesTyping(true);
    void updateNotesTypingPresence();
    typingHeartbeatTimer = setInterval(() => {
      if (!typingActive || page !== 'notes' || document.hidden) return;
      typingLastSentAt = Date.now();
      void sendNotesTyping(true);
      void updateNotesTypingPresence();
    }, NOTES_TYPING_HEARTBEAT_MS);
  }
  clearTimeout(typingStopTimer);
  typingStopTimer = setTimeout(stopNotesTyping, NOTES_TYPING_IDLE_MS);
}

function stopNotesTyping() {
  clearTimeout(typingStopTimer);
  typingStopTimer = null;
  if (typingHeartbeatTimer) clearInterval(typingHeartbeatTimer);
  typingHeartbeatTimer = null;
  if (!typingActive) return;
  typingActive = false;
  void sendNotesTyping(false);
  void updateNotesTypingPresence();
}

function syncNotesTypingFromPresence() {
  // Presence is reserved for online status. Typing is received only through
  // the dedicated Broadcast channel so Presence syncs cannot overwrite it.
}

function syncNotesTypingIndicator() {
  const thread = $('#chatThread');
  if (!thread || page !== 'notes') return;
  let indicator = $('#chatTypingIndicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'chatTypingIndicator';
    indicator.className = 'chat-typing-indicator';
    indicator.setAttribute('aria-live', 'polite');
    indicator.setAttribute('aria-atomic', 'true');
  }
  const names = [...remoteTypingUsers.values()].map(entry => entry.displayName);
  let label = '';
  if (names.length === 1) label = names[0] + ' is typing';
  else if (names.length === 2) label = names[0] + ' and ' + names[1] + ' are typing';
  else if (names.length >= 3) label = 'Several people are typing';
  indicator.hidden = !label;
  indicator.innerHTML = label
    ? '<span class="chat-typing-label">' + esc(label) + '</span><span class="chat-typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>'
    : '';
  // It stays at the end of the conversation, after the newest message.
  if (indicator.parentElement !== thread) thread.append(indicator);
  if (label) {
    const nearLatest = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 110;
    if (nearLatest) requestAnimationFrame(() => { thread.scrollTop = thread.scrollHeight; });
  }
}

/* Notes read receipts: mark only messages that remain substantially visible. */
function observeNoteSeenMessages() {
  noteSeenObserver?.disconnect();
  noteSeenObserver = null;
  const thread = $('#chatThread');
  if (!thread || page !== 'notes' || document.hidden || !me || !('IntersectionObserver' in window)) return;

  noteSeenObserver = new IntersectionObserver(entries => {
    if (page !== 'notes' || document.hidden || !document.hasFocus()) return;
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.55) continue;
      const message = entry.target;
      const ownerId = String(message.dataset.owner || '');
      const messageId = Number(message.dataset.memory);
      if (!ownerId || ownerId === String(me.id) || !Number.isSafeInteger(messageId) || messageId <= 0) continue;
      const item = feed.find(row => String(row.id) === String(messageId));
      if (!item || item.isPending || item.kind !== 'note') continue;
      queueNoteSeen(ownerId, messageId);
    }
  }, { root: thread, threshold: [0, 0.55] });

  thread.querySelectorAll('.chat-message[data-memory][data-owner]').forEach(message => noteSeenObserver.observe(message));
}

function queueNoteSeen(ownerId, messageId) {
  const owner = String(ownerId || '');
  const id = Number(messageId);
  if (!owner || owner === String(me?.id || '') || !Number.isSafeInteger(id) || id <= 0) return;
  const known = Math.max(noteSeenLastAck.get(owner) || 0, noteSeenPending.get(owner) || 0);
  if (id <= known) return;
  noteSeenPending.set(owner, id);
  // Coalesce all visible messages from the same friend into one highest-ID
  // cursor update instead of sending one RPC for every observer callback.
  if (!noteSeenDebounceTimer) {
    noteSeenDebounceTimer = setTimeout(() => {
      noteSeenDebounceTimer = null;
      void flushNoteSeenReceipts();
    }, 70);
  }
}

async function flushNoteSeenReceipts() {
  if (!sb || !me || page !== 'notes' || document.hidden || !document.hasFocus()) return;
  noteSeenDebounceTimer = null;
  const batch = [...noteSeenPending.entries()];
  noteSeenPending.clear();
  for (const [ownerId, messageId] of batch) {
    if (noteSeenInFlight.has(ownerId)) {
      noteSeenPending.set(ownerId, Math.max(noteSeenPending.get(ownerId) || 0, messageId));
      continue;
    }
    let retryDelay = 40;
    const request = (async () => {
      const { error } = await sb.rpc('mark_notes_seen', {
        p_owner_id: ownerId,
        p_last_read_message_id: messageId
      });
      if (error) throw error;
      noteSeenLastAck.set(ownerId, Math.max(noteSeenLastAck.get(ownerId) || 0, messageId));
    })();
    noteSeenInFlight.set(ownerId, request);
    request.catch(error => {
      console.warn('Notes seen receipt could not be saved:', error?.message || error);
      // Do not silently lose a read receipt on a transient network failure.
      if (page === 'notes' && !document.hidden) {
        noteSeenPending.set(ownerId, Math.max(noteSeenPending.get(ownerId) || 0, messageId));
        retryDelay = 1200;
      }
    }).finally(() => {
      noteSeenInFlight.delete(ownerId);
      if (noteSeenPending.size && page === 'notes' && !document.hidden) {
        clearTimeout(noteSeenDebounceTimer);
        noteSeenDebounceTimer = setTimeout(flushNoteSeenReceipts, retryDelay);
      }
    });
  }
}

function formatSeenRelative(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Seen';
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (elapsed < minute) return 'Seen';
  if (elapsed < hour) return 'Seen ' + Math.floor(elapsed / minute) + 'm';
  if (elapsed < day) {
    const count = Math.floor(elapsed / hour);
    return 'Seen ' + count + 'hr';
  }
  if (elapsed < week) {
    const count = Math.floor(elapsed / day);
    return 'Seen ' + count + (count === 1 ? 'day' : 'days');
  }
  if (elapsed < month) {
    const count = Math.floor(elapsed / week);
    return 'Seen ' + count + (count === 1 ? 'week' : 'weeks');
  }
  if (elapsed < year) {
    const count = Math.floor(elapsed / month);
    return 'Seen ' + count + (count === 1 ? 'month' : 'months');
  }
  const count = Math.floor(elapsed / year);
  return 'Seen ' + count + (count === 1 ? 'year' : 'years');
}

function hideSeenReceiptImmediately() {
  // A newly received friend message invalidates the previous Seen receipt at once.
  document.querySelectorAll('#chatThread .chat-seen-receipt').forEach(node => node.remove());
  for (const item of feed) {
    if (item.kind === 'note' && String(item.author?.id || item.owner_id) === String(me?.id || '')) {
      item.seen_by_count = 0;
      item.last_seen_at = null;
    }
  }
}

// Realtime INSERT events can be missed when a browser's Supabase socket is
// interrupted. While Notes is visible, poll only the newest friend note as a
// lightweight fallback; this removes stale Seen without requiring a refresh.
async function checkForIncomingFriendNote() {
  if (!sb || !me?.id || page !== 'notes' || document.hidden || notesIncomingPollInFlight) return;
  notesIncomingPollInFlight = true;
  try {
    const { data, error } = await sb.from('memories')
      .select('id,owner_id,kind,created_at')
      .eq('kind', 'note')
      .neq('owner_id', me.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return;
    const incomingId = String(data.id);
    if (lastObservedFriendNoteId === null) {
      lastObservedFriendNoteId = incomingId;
      return;
    }
    if (incomingId !== lastObservedFriendNoteId) {
      lastObservedFriendNoteId = incomingId;
      hideSeenReceiptImmediately();
      // Fetch the conversation in the background; the old Seen is already gone.
      const freshFeed = await api('/feed');
      // Merge the latest server rows into the in-memory feed. Replacing the
      // array here discards already-loaded photo/song pages and older history.
      mergeFeedRows(freshFeed);
      if (page === 'notes') renderNotesPage();
    }
  } catch (error) {
    console.warn('Incoming Notes check failed:', error?.message || error);
  } finally {
    notesIncomingPollInFlight = false;
  }
}

function startNotesIncomingPoll() {
  if (notesIncomingPollTimer) return;
  void checkForIncomingFriendNote();
  notesIncomingPollTimer = setInterval(() => {
    if (page === 'notes' && !document.hidden) void checkForIncomingFriendNote();
  }, 5000);
}


async function markNotesDelivered(messages = []) {
  if (!sb || !me?.id) return;
  const ids = messages
    .filter(item => item?.kind === 'note' && !item.isPending &&
      String(item.author?.id || item.owner_id || '') !== String(me.id))
    .map(item => Number(item.id)).filter(Number.isFinite)
    .filter(id => !noteDeliveredLocally.has(String(id)) && !noteDeliveryInFlight.has(String(id)));
  if (!ids.length) return;
  ids.forEach(id => noteDeliveryInFlight.add(String(id)));
  try {
    const { error } = await sb.rpc('mark_notes_delivered', { p_message_ids: ids });
    if (error) throw error;
    ids.forEach(id => noteDeliveredLocally.add(String(id)));
  } catch (error) {
    console.warn('Message delivery acknowledgement deferred:', error?.message || error);
  } finally {
    ids.forEach(id => noteDeliveryInFlight.delete(String(id)));
  }
}

async function refreshOwnNoteSeenStatus() {
  if (!me || !sb) return;
  if (seenStatusRefreshInFlight) {
    seenStatusRefreshQueued = true;
    return;
  }
  seenStatusRefreshInFlight = true;
  try {
    // Fetch the owner's newest note and read cursors directly in parallel.
    // This avoids the extra API wrapper request and its duplicate cursor query.
    const [{ data: latestOwnNote, error: latestError }, { data: cursors, error: cursorError }, { data: deliveries, error: deliveryError }] = await Promise.all([
      sb.from('memories').select('id').eq('owner_id', me.id).eq('kind', 'note')
        .order('id', { ascending: false }).limit(1).maybeSingle(),
      sb.from('note_read_cursors').select('reader_id,last_read_message_id,last_read_at')
        .eq('owner_id', me.id).order('last_read_message_id', { ascending: false }),
      sb.from('note_delivery_receipts').select('message_id,reader_id,delivered_at').eq('owner_id', me.id)
    ]);
    if (latestError) throw latestError;
    if (cursorError) throw cursorError;
    if (deliveryError) throw deliveryError;

    for (const item of feed) {
      if (item.kind !== 'note' || String(item.author?.id || item.owner_id) !== String(me.id)) continue;
      const messageId = Number(item.id) || 0;
      const readers = (cursors || []).filter(cursor => Number(cursor.last_read_message_id) >= messageId && messageId > 0);
      item.seen_by_count = readers.length;
      item.last_seen_at = readers.map(cursor => cursor.last_read_at).filter(Boolean).sort().at(-1) || null;
      item.delivered_by_count = (deliveries || []).filter(receipt => Number(receipt.message_id) === messageId).length;
    }

    const latestConversationNote = feed
      .filter(item => item.kind === 'note' && !item.isPending)
      .slice()
      .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))[0];
    const latestConversationNoteIsMine = latestConversationNote &&
      String(latestConversationNote.author?.id || latestConversationNote.owner_id) === String(me.id);
    const latestOwnMessageId = Number(latestConversationNote?.id || 0);
    const latestOwnNoteId = Number(latestOwnNote?.id || 0);
    const seenCursors = (cursors || []).filter(cursor =>
      latestOwnMessageId > 0 && Number(cursor.last_read_message_id) >= latestOwnMessageId
    );

    if (latestConversationNoteIsMine && latestOwnMessageId <= latestOwnNoteId && seenCursors.length) {
      latestConversationNote.seen_by_count = seenCursors.length;
      latestConversationNote.last_seen_at = seenCursors
        .map(cursor => cursor.last_read_at)
        .filter(Boolean)
        .sort()
        .at(-1) || null;
    }
    if (page === 'notes') renderNotesPage();
  } catch (error) {
    console.warn('Notes seen status could not refresh:', error?.message || error);
  } finally {
    seenStatusRefreshInFlight = false;
    if (seenStatusRefreshQueued) {
      seenStatusRefreshQueued = false;
      clearTimeout(seenStatusRefreshTimer);
      seenStatusRefreshTimer = setTimeout(() => void refreshOwnNoteSeenStatus(), 0);
    }
  }
}

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

function handleNotesPageTransition(payload) {
  const senderId = String(payload?.user_id || payload?.userId || '');
  const senderUsername = String(payload?.username || '').trim().toLowerCase();
  if (!senderId && !senderUsername) return;
  if (page !== 'notes' || document.hidden) return;

  const ownId = String(me?.id || '');
  const ownUsername = String(me?.username || '').trim().toLowerCase();
  if ((senderId && senderId === ownId) ||
      (senderUsername && senderUsername === ownUsername)) return;

  const isFriend = (Array.isArray(friends) ? friends : []).some(friend => {
    const friendId = String(friend?.id || friend?.user_id || '');
    const friendUsername = String(friend?.username || '').trim().toLowerCase();
    return (!!senderId && !!friendId && senderId === friendId) ||
      (!!senderUsername && !!friendUsername && senderUsername === friendUsername);
  });
  if (!isFriend) return;

  const transition = String(payload?.transition || '').toLowerCase();
  if (transition !== 'entered' && transition !== 'left') return;
  triggerFriendPresenceSweep(senderId || senderUsername, transition);
}

async function sendNotesPageTransition(payload) {
  if (!payload) return;
  if (!notesActivityChannel || !notesActivityChannelReady) {
    pendingNotesPageTransitions.push(payload);
    if (pendingNotesPageTransitions.length > 20) pendingNotesPageTransitions.shift();
    return;
  }
  const channel = notesActivityChannel;
  try {
    const result = await channel.send({
      type: 'broadcast',
      event: 'notes_page_transition',
      payload
    });
    if (result !== 'ok') {
      console.warn('Notes page transition broadcast was not acknowledged:', result);
    }
  } catch (error) {
    console.warn('Notes page transition broadcast failed:', error?.message || error);
  }
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

async function clearActiveNotesNotifications() {
  if (!me || page !== 'notes') return;
  const userId = String(me.id);
  try {
    const rows = await api('/notifications');
    if (String(me?.id || '') !== userId || page !== 'notes') return;
    const noteRows = rows.filter(row => row.kind === 'note');
    if (!noteRows.length) return;
    const noteIds = new Set(noteRows.map(row => String(row.id)));
    notificationRows = notificationRows.filter(row => !noteIds.has(String(row.id)));
    updateNotificationBadge();
    await Promise.all(noteRows.map(row =>
      api('/notifications/' + encodeURIComponent(row.id), { method: 'DELETE' }).catch(error => {
        console.warn('Active Notes notification could not be dismissed:', error?.message || error);
      })
    ));
  } catch (error) {
    console.warn('Active Notes notifications could not be refreshed:', error?.message || error);
  }
}

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
  const badge = $('#notificationBadge'), count = notificationRows.filter(n => !n.read_at && !(page === 'notes' && n.kind === 'note' && !/\bliked your note\b/i.test(String(n.message || '')))).length;
  badge.textContent = count > 9 ? '9+' : String(count);
  badge.classList.toggle('hidden', count === 0);
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

async function searchFriends() {
  const q = $('#friendSearch').value.trim();
  friendQuery = q;
  if (!q) {
    friendResults = [];
    render();
    return toast('Type your friend’s username first ♡');
  }
  if (!/^[a-zA-Z0-9_]{1,24}$/.test(q)) return toast('Usernames use letters, numbers, and underscores ♡');
  try {
    friendResults = await api('/users?q=' + encodeURIComponent(q));
    render();
  } catch (e) {
    toast(e.message);
  }
}

function cacheMediaSource(key, entry) {
  mediaUrlCache.set(key, entry);
  // Keep recently viewed photos available when the user moves between tabs.
  // The Cache API stores the image bytes; this in-memory map stores lightweight
  // object URLs so rebuilding the gallery does not request the same image again.
  if (mediaUrlCache.size > 80) {
    const oldestKey = mediaUrlCache.keys().next().value;
    const oldestEntry = mediaUrlCache.get(oldestKey);
    mediaUrlCache.delete(oldestKey);
    const oldestUrl = typeof oldestEntry === 'string' ? oldestEntry : oldestEntry?.url;
    if (oldestUrl?.startsWith('blob:')) URL.revokeObjectURL(oldestUrl);
  }
}

function photoCacheRequest(memory) {
  const path = String(memory.storagePath || memory.id);
  return new Request(new URL('/__cute-bunny-photo-cache__/' + encodeURIComponent(path), location.origin).href);
}

async function resolveMediaSource(memory) {
  const key = String(memory.id);
  const cached = mediaUrlCache.get(key);
  if (cached) {
    const entry = typeof cached === 'string'
      ? { url: cached, expiresAt: Number.MAX_SAFE_INTEGER }
      : cached;
    if (entry.url && entry.expiresAt > Date.now() + 30000) return entry.url;
    if (entry.url?.startsWith('blob:')) URL.revokeObjectURL(entry.url);
    mediaUrlCache.delete(key);
  }

  const pending = mediaHydrationInFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    const cacheKey = photoCacheRequest(memory);
    let response = null;
    let photoCache = null;

    // Cache the actual image bytes, not only the temporary signed URL. Signed
    // URLs expire; the cached response remains usable when the gallery is reopened.
    if ('caches' in window) {
      try {
        photoCache = await caches.open('cute-bunny-photo-cache-v1');
        response = await photoCache.match(cacheKey);
      } catch (error) {
        console.warn('Persistent photo cache unavailable:', error?.message || error);
      }
    }

    if (!response) {
      // Use a compact gallery rendition while preserving each photo's aspect ratio.
      // GIFs stay original so their animation is not lost.
      const storage = sb.storage.from('memories');
      const isGif = /image\/gif/i.test(memory.contentType || memory.content_type || '');
      let result = isGif
        ? await storage.createSignedUrl(memory.storagePath, 3600)
        : await storage.createSignedUrl(memory.storagePath, 3600, {
            transform: { width: 960, quality: 78, resize: 'contain' }
          });
      if (result.error && !isGif) result = await storage.createSignedUrl(memory.storagePath, 3600);
      if (result.error || !result.data?.signedUrl) throw result.error || new Error('The photo could not be loaded.');

      const signedUrl = result.data.signedUrl;
      try {
        const downloaded = await fetch(signedUrl, { mode: 'cors' });
        if (downloaded.ok) {
          response = downloaded.clone();
          if (photoCache) {
            try { await photoCache.put(cacheKey, downloaded.clone()); }
            catch (error) { console.warn('Photo could not be saved to persistent cache:', error?.message || error); }
          }
        }
      } catch (error) {
        // Some storage configurations disallow cross-origin fetch; the signed
        // URL remains a safe fallback and still benefits from browser HTTP caching.
        console.warn('Using direct photo URL fallback:', error?.message || error);
        cacheMediaSource(key, { url: signedUrl, expiresAt: Date.now() + 3500000 });
        return signedUrl;
      }
      if (!response) {
        cacheMediaSource(key, { url: signedUrl, expiresAt: Date.now() + 3500000 });
        return signedUrl;
      }
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    cacheMediaSource(key, { url: objectUrl, expiresAt: Number.MAX_SAFE_INTEGER });
    return objectUrl;
  })();

  mediaHydrationInFlight.set(key, request);
  try {
    return await request;
  } finally {
    if (mediaHydrationInFlight.get(key) === request) mediaHydrationInFlight.delete(key);
  }
}

async function prewarmPhotoSources(items, concurrency = 4) {
  const queue = (items || []).filter(item => item?.kind === 'photo' && item.storagePath && !item.isPending);
  if (!queue.length || !sb) return;
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (next < queue.length) {
      const item = queue[next++];
      try { await resolveMediaSource(item); }
      catch (error) { console.warn('Photo preloading skipped:', error?.message || error); }
    }
  });
  await Promise.all(workers);
}

async function hydrateOneMedia(node) {
  if (!node || node.getAttribute('src') || node.dataset.mediaLoading === 'true') return;
  try {
    const memory = feed.find(item => String(item.id) === String(node.dataset.media));
    if (!memory?.storagePath || memory.isPending) return;
    node.dataset.mediaLoading = 'true';
    if (node.loading !== 'eager') node.loading = 'lazy';
    node.decoding = 'async';
    const url = await resolveMediaSource(memory);
    if (node.isConnected && !node.getAttribute('src')) node.src = url;
  } catch (error) {
    console.warn('Photo could not be loaded:', error?.message || error);
  } finally {
    delete node.dataset.mediaLoading;
  }
}

function hydrateMedia() {
  mediaObserver?.disconnect();
  mediaObserver = null;
  if (!sb) return;
  const nodes = [...document.querySelectorAll('[data-media]')];
  nodes.forEach((node, index) => {
    // Prioritize the whole first screen of the garden, not just a few images.
    // Remaining photos begin loading well before they enter the viewport.
    const prioritize = page === 'gallery' && index < 12;
    node.loading = prioritize ? 'eager' : 'lazy';
    node.decoding = 'async';
    node.fetchPriority = prioritize && index < 4 ? 'high' : 'auto';
  });
  if ('IntersectionObserver' in window) {
    mediaObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        mediaObserver.unobserve(entry.target);
        void hydrateOneMedia(entry.target);
      }
    }), { rootMargin: page === 'gallery' ? '1400px 0px' : '500px 0px' });
    nodes.slice(0, page === 'gallery' ? 12 : 0).forEach(node => void hydrateOneMedia(node));
    nodes.slice(page === 'gallery' ? 12 : 0).forEach(node => mediaObserver.observe(node));
    if (page === 'music') warmSongSources(feed.filter(item => item.kind === 'song').slice(0, 8));
  } else nodes.forEach(node => void hydrateOneMedia(node));
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
  const R=Math.PI/180,G=318,CX=[200,400],S=[1,-1],L1=24,L2=20,NAME=["Daddy","Mommy"];
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
<g id="bears">${bear(0)}${bear(1)}<g id="tummyBackArm" opacity="0" pointer-events="none"><path id="tummyBackArmOutline" fill="none" stroke="#6e4529" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/><path id="tummyBackArmFill" fill="none" stroke="#9b6a47" stroke-width="21" stroke-linecap="round" stroke-linejoin="round"/><g id="tummyBackPaw"><circle r="12.5" fill="#9b6a47" stroke="#6e4529" stroke-width="2.2"/><ellipse cx="-7" cy="-8" rx="4" ry="3.2" fill="#9b6a47" stroke="#6e4529" stroke-width="1.3"/><ellipse cx="0" cy="-10" rx="4" ry="3.2" fill="#9b6a47" stroke="#6e4529" stroke-width="1.3"/><ellipse cx="7" cy="-8" rx="4" ry="3.2" fill="#9b6a47" stroke="#6e4529" stroke-width="1.3"/><path d="M-4 2Q0 5 4 2" fill="none" stroke="#d7a58a" stroke-width="1.4" stroke-linecap="round"/></g></g></g><g font-family="Nunito,Segoe UI,sans-serif" font-size="10" font-weight="800" fill="#8b6a7e" text-anchor="middle"><text x="200" y="377">Daddy</text><text x="400" y="377">Mommy</text></g>
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
const idle=(b,t)=>{const w=Math.sin(t*1.2+b*1.7);return{x:0,y:0,rot:w*1.2,hr:Math.sin(t*.8+b*2.3)*3+2,hx:0,hy:0,eye:1,eh:1,mouth:0,pk:0,blush:.3,i1:-12+w*2,i2:-6,o1:12-w*2,o2:6}};
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
 return{x:64,hr:open?12:chew?7:4,hx:open?8:chew?3:0,mouth:open?.9:chew?.2+.2*Math.abs(Math.sin(t*14)):t>5.2?.05:0,eye:chew?.12:1,blush:chew||t>5.2?.9:.5}}
};
const END={kiss:3.8,flykiss:3.6,slap:2.8,feed:6.8,tummy:4.6};


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
    idle: 'Mommy and Daddy are relaxing together. 🌸'
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

// Notes message gestures: button press feedback, tap to like, hold for Copy/Delete.
document.addEventListener('pointerdown', e => {
  const bubble = e.target.closest('.chat-page .chat-bubble, .home-note-memory .chat-bubble');
  if (!bubble || e.target.closest('button, .chat-actions-popup') || (e.pointerType === 'mouse' && e.button !== 0)) return;

  clearTimeout(messagePressState.timer);
  clearTimeout(messagePressState.suppressTimer);
  messagePressState.suppressClick = false;
  messagePressState.longPressed = false;
  messagePressState.bubble = bubble;
  messagePressState.pointerId = e.pointerId;
  messagePressState.startX = e.clientX;
  messagePressState.startY = e.clientY;
  bubble.classList.add('is-pressed');

  messagePressState.timer = setTimeout(() => {
    if (!messagePressState.bubble?.isConnected || messagePressState.pointerId !== e.pointerId) return;
    const id = messagePressState.bubble.dataset.chatMessageId;
    if (!id) return;
    messagePressState.longPressed = true;
    messagePressState.suppressClick = true;
    showMessageActions(id, messagePressState.bubble);
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

function syncChatComposerState(field = $('#chatInput')) {
  const send = $('#chatSend');
  const composer = $('#chatComposer');
  if (!send || !composer) return;
  const hasMessage = !!field?.value.trim();
  composer.classList.toggle('has-message', hasMessage);
  send.hidden = !hasMessage;
  send.disabled = !hasMessage;
  send.setAttribute('aria-hidden', String(!hasMessage));
  send.setAttribute('aria-label', hasMessage ? 'Send message' : 'Write a message first');
}

function isTouchNotesViewport() {
  const touchDevice = window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
  return window.matchMedia('(max-width: 720px)').matches && touchDevice;
}

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
function syncNotesKeyboardLayout() {
  const notesPage = document.querySelector('.chat-page');
  if (!notesPage || page !== 'notes') {
    document.body.classList.remove('notes-keyboard-open');
    document.body.classList.remove('notes-header-hidden');
    notesHeaderLastScrollTop = null;
    notesKeyboardDismissed = false;
    document.documentElement.style.setProperty('--notes-keyboard-inset', '0px');
    document.documentElement.style.removeProperty('--notes-page-height');
    notesKeyboardFollowLatest = false;
    return;
  }

  const input = $('#chatInput');
  const thread = $('#chatThread');
  const composer = $('#chatComposer');
  const focused = document.activeElement === input;
  const viewport = window.visualViewport;
  const mobile = isTouchNotesViewport();
  const visualHeight = viewport?.height || window.innerHeight;
  const visualTop = viewport?.offsetTop || 0;
  const visibleViewportBottom = visualTop + visualHeight;
  const keyboardInset = Math.max(0, Math.round(window.innerHeight - visibleViewportBottom));
  const viewportHeightDrop = Math.max(0, window.innerHeight - visualHeight);
  const wasOpen = document.body.classList.contains('notes-keyboard-open');

  // Use separate open/close thresholds to avoid flicker while the keyboard animates.
  const viewportSuggestsKeyboard = viewport
    ? (
      keyboardInset > (wasOpen ? 48 : 100) ||
      viewportHeightDrop > (wasOpen ? 70 : 130) ||
      visualHeight < window.screen.height * 0.72
    )
    : window.innerHeight < window.screen.height * 0.72;
  const keyboardOpen = mobile && viewportSuggestsKeyboard && (focused || wasOpen);

  // Follow the newest message only when the reader was already at the bottom.
  // This keeps the latest conversation visible without pulling someone away
  // from older messages they were intentionally reading.
  if (keyboardOpen && !wasOpen && thread) {
    const distanceFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    notesKeyboardFollowLatest = distanceFromBottom < 88;
  }

  notesPage.classList.toggle('notes-keyboard-open', keyboardOpen);
  document.body.classList.toggle('notes-keyboard-open', keyboardOpen);
  if (keyboardOpen && focused && !notesKeyboardDismissed) {
    document.body.classList.add('notes-header-hidden');
    notesHeaderLastScrollTop = thread?.scrollTop ?? notesHeaderLastScrollTop;
  } else if (wasOpen || notesKeyboardDismissed) {
    document.body.classList.remove('notes-header-hidden');
    notesHeaderLastScrollTop = thread?.scrollTop ?? null;
  }
  if (!keyboardOpen) notesKeyboardDismissed = false;
  document.documentElement.style.setProperty(
    '--notes-keyboard-inset',
    keyboardOpen ? keyboardInset + 'px' : '0px'
  );

  if (keyboardOpen) {
    // Constrain the message list to the visible viewport ending just above
    // the software keyboard, while keeping the top app header in its original place.
    const pageTop = notesPage.getBoundingClientRect().top;
    const availableHeight = Math.max(180, Math.floor(visibleViewportBottom - pageTop));
    document.documentElement.style.setProperty('--notes-page-height', availableHeight + 'px');

    // The composer floats over the bottom of the thread, so reserve its height
    // to ensure the last message can scroll fully into view above the input.
    if (thread) {
      const composerHeight = Math.ceil(composer?.getBoundingClientRect().height || 50);
      const bottomClearance = composerHeight + 20;
      thread.style.setProperty('padding-bottom', bottomClearance + 'px', 'important');
      thread.style.setProperty('scroll-padding-bottom', bottomClearance + 'px');
    }

    requestAnimationFrame(() => {
      if (!notesPage.isConnected || !thread?.isConnected || !notesKeyboardFollowLatest) return;
      thread.scrollTop = thread.scrollHeight;
    });
  } else {
    document.documentElement.style.removeProperty('--notes-page-height');
    thread?.style.removeProperty('padding-bottom');
    thread?.style.removeProperty('scroll-padding-bottom');
    notesKeyboardFollowLatest = false;
  }
}

let notesKeyboardSyncFrame = 0;
function scheduleNotesKeyboardLayout() {
  if (notesKeyboardSyncFrame) return;
  notesKeyboardSyncFrame = requestAnimationFrame(() => {
    notesKeyboardSyncFrame = 0;
    syncNotesKeyboardLayout();
  });
}

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
function syncNotesSeenReceiptVisibility(thread = $('#chatThread')) {
  if (!thread) return;
  const status = $('#chatSeenStatus');
  if (!status) return;
  const distanceFromBottom = Math.max(0, thread.scrollHeight - thread.scrollTop - thread.clientHeight);
  const hasReceipt = status.getAttribute('aria-label') !== 'Not seen';
  status.hidden = !hasReceipt || distanceFromBottom > 32;
}

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

// Chat form submission
// Chat form submission
document.addEventListener('submit', event => {
  if (event.target.id === 'chatComposer') {
    event.preventDefault();
    void sendChatMessage();
  }
});

document.addEventListener('keydown', event => {
  if (
    event.target.id === 'chatInput' &&
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.isComposing &&
    event.keyCode !== 229 &&
    !isTouchNotesViewport()
  ) {
    // Enter sends on desktop; on phones it keeps the keyboard's normal new-line action.
    event.preventDefault();
    void sendChatMessage();
    return;
  }
  if (event.key === 'Escape') {
    if (event.target.id === 'chatInput') {
      event.target.blur();
      return;
    }
    closeAllGates();
  }
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
