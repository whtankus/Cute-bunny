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
let appPageStack = ['home'], appBackGuardInstalled = false, appBackExitArmedUntil = 0, appBackExitPending = false;
let mediaObjectUrls = [], mediaUrlCache = new Map(), mediaHydrationInFlight = new Map(), pendingMediaUrls = new Map();
const memoryLikeInFlight = new Set();
let feedHasMore = false, feedLoadingMore = false;
const FEED_PAGE_SIZE = 40;
const feedPageOffsets = { all: 0, photo: 0, song: 0 };
const feedPageHasMore = { all: false, photo: true, song: true };
const mediaVisibleCount = { photo: 8, song: 8 };
let feedHistoryObserver = null, feedHistoryScrollArmed = false, mediaPageLoading = { photo: false, song: false };
let mediaObserver = null;
let mediaInitialLoaded = { photo: false, song: false };
let pendingDeleteTimers = new Map(), authMode = 'register';
let playlist = [], playlistIndex = -1, audioObjectUrl = '', songLoadSequence = 0;
const songUrlCache = new Map(), songUrlInFlight = new Map();
let notificationRows = [], notificationLoaded = false, notificationLoading = false;
let notificationSeenObserver = null, notificationDismissals = new Set();
let notificationListSeenObserver = null, notificationRowViewTimers = new Map();
let notificationViewedIds = new Set();
let navRefreshInFlight = false, appExitStep = 0;
let presenceChannel = null, notificationChannel = null, memoryChannel = null, profileChannel = null;
let activeMessageActionsId = null;
let hiddenNoteIds = new Set();
let homeNavRefreshInFlight = false;
let notesHeaderLastScrollTop = null;
let notesKeyboardDismissed = false;
let streakSelectedWeekDate = '';
let streakGardenActiveTab = 'promises';
let streakPetalGame = { cards: [], flipped: [], matched: [], moves: 0, locked: false, completed: false, newBest: false };
let streakCountdownInterval = null, streakCountdownDayKey = '';
let presenceStatus = 'closed';
let lastActiveWriteAt = 0, lastActiveWriteUserId = '';
let streakRecordInFlight = null, streakRecordInFlightKey = '';
const noteGraphemeSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;
const messagePressState = { timer:null, bubble:null, pointerId:null, startX:0, startY:0, longPressed:false, suppressClick:false, suppressTimer:null };
const photoPressState = { timer:null, image:null, pointerId:null, startX:0, startY:0, suppressClick:false, suppressTimer:null, clickTimer:null, pendingPhotoId:null };
const bubbleTapState = { timer:null, bubble:null };
let lastTouchMemoryTap = { id: '', time: 0, tile: null };
let suppressNativeMemoryDblclickUntil = 0;


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
  playBoing();
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
  const { data, error } = await sb.from('memories')
    .select('owner_id,memory_likes(count)')
    .in('owner_id', ids);
  if (error) {
    console.warn('Friend heart totals could not be loaded:', error.message || error);
    return null;
  }
  const totals = new Map(ids.map(id => [id, 0]));
  (data || []).forEach(memory => {
    const likes = Array.isArray(memory.memory_likes) ? memory.memory_likes : [];
    const count = likes.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
    const ownerId = String(memory.owner_id);
    totals.set(ownerId, (totals.get(ownerId) || 0) + count);
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
    return {
      ...data,
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
      theme: body.theme,
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
    const ids = body.ids || [];
    if (ids.length) {
      const { error } = await sb.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
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
    const offset = Math.max(0, Number(offsetMatch?.[1]) || 0);
    const pageSize = Math.min(120, Math.max(1, Number(limitMatch?.[1]) || FEED_PAGE_SIZE));
    let memoriesQuery = sb.from('memories')
      .select('*,author:profiles!memories_owner_id_fkey(id,username,display_name,mascot,theme)')
      .order('created_at', { ascending: false }).order('id', { ascending: false });
    if (kindMatch) memoriesQuery = memoriesQuery.eq('kind', kindMatch[1]);
    const { data: rows, error } = await memoriesQuery.range(offset, offset + pageSize - 1);
    fail(error);

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

    return (rows || []).map(m => {
      const likeState = likesByMemory.get(String(m.id)) || { count: 0, likedByMe: false };
      const author = Array.isArray(m.author) ? m.author[0] : (m.author || {});
      return {
        ...m,
        like_count: likeState.count,
        liked_by_me: likeState.likedByMe,
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
    const basic = 'id,username,display_name,bio,theme,mascot,profile_wallpaper,created_at,last_active_at';
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
    const basic = 'followed_id,created_at,followed:profiles!follows_followed_id_fkey(id,username,display_name,bio,theme,mascot,profile_wallpaper,created_at,last_active_at)';
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
  const palette = { rose: '#fdf1ea', lavender: '#f7f4fc', mint: '#f3faf4', sky: '#f3f9fc' };
  meta.setAttribute('content', document.body.dataset.mode === 'dark'
    ? '#241e2c'
    : (palette[document.body.dataset.theme] || palette.rose));
}

function setTheme(theme) {
  document.body.dataset.theme = ['rose', 'lavender', 'mint', 'sky'].includes(theme) ? theme : 'rose';
  syncBrowserThemeColor();
}

function setUser(u) {
  if (me?.id !== u.id) {
    notificationRows = [];
    notificationLoaded = false;
    notificationLoading = false;
  }
  me = u;
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
  startStreakCountdown();
  void loadNotifications();
}

async function refresh() {
  const results = await Promise.all([
    api('/me'),
    api('/feed'),
    api('/following'),
    api('/feed?kind=photo&limit=8').catch(error => { console.warn('Photo warm cache skipped:', error?.message || error); return null; }),
    api('/feed?kind=song&limit=8').catch(error => { console.warn('Music warm cache skipped:', error?.message || error); return null; })
  ]);
  me = results[0];
  const feedById = new Map();
  [...results[1], ...(results[3] || []), ...(results[4] || [])].forEach(item => feedById.set(String(item.id), item));
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
  friends = results[2];
  render();
  if (page === 'gallery' && !mediaInitialLoaded.photo) void loadLatestMedia('photo');
  else if (page === 'music' && !mediaInitialLoaded.song) void loadLatestMedia('song');
  syncStreakWidget();
  syncPresenceUI();
  if (!$('#friendProfileGate').classList.contains('hidden')) {
    const profile = $('#friendProfileGate').dataset.ownProfile === 'true' ? me : [...friends, ...friendResults].find(user => user.username === $('#friendProfileGate').dataset.username);
    if (profile) showFriendProfile(profile);
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
  const kind = page === 'gallery' ? 'photo' : page === 'music' ? 'song' : 'all';
  if (!feedPageHasMore[kind] || (kind !== 'all' && mediaPageLoading[kind])) return;
  feedLoadingMore = true; setFeedHistoryLoading(true);
  const previousScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  try {
    const offset = feedPageOffsets[kind];
    const query = kind === 'all' ? '/feed?offset=' + offset : '/feed?kind=' + kind + '&offset=' + offset;
    const older = await api(query);
    feedPageOffsets[kind] += older.length;
    feedPageHasMore[kind] = older.length === FEED_PAGE_SIZE;
    if (kind !== 'all') mediaVisibleCount[kind] += older.length;
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
  const threadTop = $('#chatThread')?.getBoundingClientRect().top || 0;
  const near = page === 'notes'
    ? rect.bottom >= threadTop - 220 && rect.top <= threadTop + 220
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
  if (towardHistory) { feedHistoryScrollArmed = true; requestAnimationFrame(tryAutoLoadFeedHistory); }
}, { passive: true });
document.addEventListener('touchmove', event => {
  const y = event.touches?.[0]?.clientY;
  if (y == null || feedHistoryTouchY == null) return;
  const fingerDelta = y - feedHistoryTouchY;
  feedHistoryTouchY = y;
  const towardHistory = page === 'notes' ? fingerDelta > 0 : fingerDelta < 0;
  if (towardHistory) { feedHistoryScrollArmed = true; requestAnimationFrame(tryAutoLoadFeedHistory); }
}, { passive: true });
const themeNames = { rose: 'Rose garden', lavender: 'Lavender skies', mint: 'Mint meadow', sky: 'Bluebird day' };
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
  return Number.isNaN(date.getTime()) ? 'A little while ago' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
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
  const online = isPresenceUserOnline(user.id, liveState);
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
    '<span class="streak-plant-illustration" aria-hidden="true">' +
      '<span class="streak-plant-flower streak-plant-flower-one">🌸</span>' +
      '<span class="streak-plant-flower streak-plant-flower-two">🌼</span>' +
      '<span class="streak-plant-flower streak-plant-flower-three">🌷</span>' +
      '<span class="streak-plant-leaf streak-plant-leaf-one">🌿</span>' +
      '<span class="streak-plant-leaf streak-plant-leaf-two">🍃</span>' +
      '<span class="streak-plant-pot"><i>♡</i></span>' +
    '</span></div>' +
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
  playBoing();
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

function renderStreakPage() {
  const content = $('#content');
  if (!content || !me) return;
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
  if (!streakPetalGame.cards.length) resetStreakPetalGame();
  const allTimeGoalCompletions = countSavedStreakGoalCompletions();

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

  const milestoneIllustrations = [
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 79V44" stroke="#789b76" stroke-width="4" stroke-linecap="round"/><path d="M50 61C29 39 18 51 25 62c8 10 18 5 25-1Z" fill="#a9c49d"/><path d="M50 53C69 31 82 42 75 54c-7 9-17 5-25-1Z" fill="#789e79"/><path d="M50 44C39 29 43 17 50 11c9 9 11 21 0 33Z" fill="#9db98d"/><path d="M50 79H26M50 79h25" stroke="#c49a76" stroke-width="3" stroke-linecap="round"/></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 79V44" stroke="#789b76" stroke-width="4" stroke-linecap="round"/><path d="M49 64c-16-13-24-4-18 4 6 6 12 2 18-4Z" fill="#9db98d"/><g fill="#e8a2bc"><ellipse cx="50" cy="23" rx="8" ry="16"/><ellipse cx="50" cy="23" rx="8" ry="16" transform="rotate(60 50 23)"/><ellipse cx="50" cy="23" rx="8" ry="16" transform="rotate(120 50 23)"/></g><circle cx="50" cy="23" r="8" fill="#f4d17f"/><path d="M50 79H28h44" stroke="#c49a76" stroke-width="3" stroke-linecap="round"/></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M12 76c20-12 53-12 76 0" fill="#d9e6cd"/><path d="M21 76V48m0 13c-13-14-19-5-13 3 5 5 10 2 13-3Zm0-10c11-12 18-6 13 2-4 5-9 3-13-2Z" fill="#91ad83"/><path d="M49 76V38m0 24c-18-16-24-5-17 4 6 5 12 2 17-4Zm0-13c15-18 24-7 17 2-6 7-12 4-17-2Z" fill="#789d78"/><path d="M77 76V50m0 13c-12-12-18-4-12 3 5 4 9 2 12-3Z" fill="#a8bd8d"/><circle cx="21" cy="45" r="6" fill="#e7a4bd"/><circle cx="49" cy="34" r="7" fill="#d9b6e2"/><circle cx="77" cy="46" r="6" fill="#edc77d"/></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 79V37" stroke="#789b76" stroke-width="4" stroke-linecap="round"/><path d="M50 65C27 41 19 56 29 66c7 7 14 3 21-1Zm0-14c20-24 31-9 21 1-7 7-14 3-21-1Z" fill="#85a47d"/><g fill="#e7a2bd"><circle cx="50" cy="25" r="13"/><circle cx="37" cy="29" r="10"/><circle cx="63" cy="29" r="10"/><circle cx="50" cy="13" r="10"/></g><circle cx="50" cy="25" r="6" fill="#f4d17f"/></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 79 28 37m22 42 22-42M50 79V27" stroke="#7b9b75" stroke-width="3.5" stroke-linecap="round"/><path d="M39 58c-18-13-23-1-14 7 6 4 11 0 14-7Zm22 0c18-13 23-1 14 7-6 4-11 0-14-7Z" fill="#9db98d"/><g fill="#e9a7bf"><circle cx="28" cy="31" r="9"/><circle cx="22" cy="24" r="7"/><circle cx="34" cy="24" r="7"/></g><g fill="#d7b4e4"><circle cx="72" cy="31" r="9"/><circle cx="66" cy="24" r="7"/><circle cx="78" cy="24" r="7"/></g><g fill="#e4bd72"><circle cx="50" cy="20" r="10"/><circle cx="43" cy="13" r="7"/><circle cx="57" cy="13" r="7"/></g><circle cx="28" cy="31" r="3" fill="#f2d17d"/><circle cx="72" cy="31" r="3" fill="#f2d17d"/></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M10 76c18-20 62-20 80 0" fill="#dce8d1"/><path d="M25 76V42m0 15c-15-14-22-3-14 6 5 5 10 2 14-6Zm0-12c12-16 21-7 14 1-5 6-10 5-14-1Z" fill="#789c77"/><path d="M50 76V27m0 35c-21-20-30-6-19 4 7 6 14 2 19-4Zm0-17c18-20 29-8 18 2-7 6-13 4-18-2Z" fill="#8eae82"/><path d="M76 76V44m0 15c-15-14-21-4-14 4 5 5 10 2 14-4Z" fill="#a5bd91"/><g fill="#e8a1bb"><circle cx="25" cy="37" r="7"/><circle cx="50" cy="22" r="9"/><circle cx="76" cy="39" r="7"/></g><g fill="#f1d17f"><circle cx="25" cy="37" r="3"/><circle cx="50" cy="22" r="4"/><circle cx="76" cy="39" r="3"/></g></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 78V39" stroke="#789b76" stroke-width="4" stroke-linecap="round"/><path d="M50 62C26 43 20 57 30 67c7 6 14 1 20-5Zm0-12c19-24 31-9 21 1-7 7-14 3-21-1Z" fill="#789e79"/><g fill="#dcb7e7"><circle cx="50" cy="24" r="11"/><circle cx="37" cy="26" r="8"/><circle cx="63" cy="26" r="8"/><circle cx="50" cy="11" r="8"/></g><circle cx="50" cy="24" r="5" fill="#f4d17f"/><path d="M15 20 18 9l3 11 10 3-10 3-3 10-3-10-10-3Z" fill="#e8c77d"/><path d="m82 13 2-7 2 7 7 2-7 2-2 7-2-7-7-2Z" fill="#dcb7e7"/><circle cx="25" cy="66" r="3" fill="#edc77d"/><circle cx="80" cy="57" r="4" fill="#e7a2bd"/></svg>',
    '<svg viewBox="0 0 100 88" aria-hidden="true"><path d="M50 80V40" stroke="#688b6c" stroke-width="5" stroke-linecap="round"/><path d="M50 67C22 48 17 63 29 73c8 6 15 1 21-6Zm0-14c23-25 37-8 24 4-8 7-16 2-24-4Z" fill="#83a47a"/><path d="M50 45C26 24 33 8 50 3c18 8 26 26 0 42Z" fill="#87a978"/><g fill="#e9a4bd"><circle cx="37" cy="22" r="8"/><circle cx="63" cy="24" r="9"/><circle cx="49" cy="11" r="9"/><circle cx="50" cy="34" r="9"/></g><g fill="#f1d17f"><circle cx="37" cy="22" r="3"/><circle cx="63" cy="24" r="3"/><circle cx="49" cy="11" r="3"/><circle cx="50" cy="34" r="3"/></g><path d="M20 80h60" stroke="#bd9a74" stroke-width="3" stroke-linecap="round"/></svg>'
  ];
  const badges = milestones.map((item, index) => {
    const unlocked = earned.has(item.days);
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

    '<section class="sg-game-section sg-game-compact"><div class="sg-petal-banner-copy">' +
      '<div class="sg-compact-section-heading"><h3>Petal Pairs</h3><b id="streakGamePairsLeft">6 pairs left</b></div>' +
      '<p class="sg-petal-banner-note">Find and match the hidden pairs</p>' +
      '</div>' +
      '<div class="sg-petal-board" id="streakGameBoard" aria-label="Petal pairs memory game with six pairs"></div></section>',
    '<section class="sg-friends-section sg-friends-compact"><div class="sg-friends-heading"><h3>Friends in Bloom</h3></div>' +
      streakFriendsMarkup() + '</section>',
    '<div class="sg-bottom-tabs-wrap">',
    '<div class="sg-bottom-tabs" role="tablist" aria-label="Garden details">' +
      '<button type="button" class="sg-bottom-tab' + (streakGardenActiveTab === 'promises' ? ' is-active' : '') + '" id="sgPromisesTab" role="tab" aria-controls="sgPromisesPanel" aria-selected="' + (streakGardenActiveTab === 'promises') + '" data-streak-garden-tab="promises"><span class="sg-tab-icon" aria-hidden="true">♡</span><span class="sg-tab-label">Your Little Promises</span></button>' +
      '<button type="button" class="sg-bottom-tab' + (streakGardenActiveTab === 'milestones' ? ' is-active' : '') + '" id="sgMilestonesTab" role="tab" aria-controls="sgMilestonesPanel" aria-selected="' + (streakGardenActiveTab === 'milestones') + '" data-streak-garden-tab="milestones"><span class="sg-tab-icon" aria-hidden="true">✿</span><span class="sg-tab-label">Your Garden Milestones</span></button></div>',
    '<section class="sg-tab-panel' + (streakGardenActiveTab === 'promises' ? ' is-active' : '') + '" id="sgPromisesPanel" role="tabpanel" aria-labelledby="sgPromisesTab"' + (streakGardenActiveTab === 'promises' ? '' : ' hidden') + '>' +
      '<section class="sg-goals-section"><div class="sg-section-heading"><div><h3>Your Little Promises</h3><p>Optional goals for today</p></div><span class="sg-goal-count" id="streakGoalProgress">' + completed + ' / ' + goals.length + '</span></div>' +
      '<div class="sg-goal-progress"><span id="streakGoalProgressBar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (goals.length ? Math.round(completed / goals.length * 100) : 0) + '" style="width:' + (goals.length ? completed / goals.length * 100 : 0) + '%"></span></div>' +
      '<div class="sg-goal-list" id="streakGoalsList">' + goalMarkup + '</div>' +
      '<p class="sg-alltime-goals" id="sgAllTimeGoalCount"' + (allTimeGoalCompletions ? '' : ' hidden') + '>' + allTimeGoalCompletions + ' goals completed</p>' +
      '<button type="button" class="sg-add-goal" id="streakAddGoal"><span>＋</span> Add a goal</button>' +
      '<form class="sg-add-form hidden" id="streakGoalForm"><input class="input" id="streakGoalInput" maxlength="56" placeholder="Add a little goal…" required><button type="submit" class="primary">Plant goal</button></form></section></section>',
    '<section class="sg-tab-panel' + (streakGardenActiveTab === 'milestones' ? ' is-active' : '') + '" id="sgMilestonesPanel" role="tabpanel" aria-labelledby="sgMilestonesTab"' + (streakGardenActiveTab === 'milestones' ? '' : ' hidden') + '>' +
      '<section class="sg-milestones-section"><div class="sg-section-heading"><div><h3>Your Garden Milestones</h3><p>' + earned.size + ' of ' + milestones.length + ' blooms unlocked</p></div></div>' +
      '<div class="sg-milestone-route">' + badges + '</div></section></section>',
    '</div>',
    '</div>',
  ].join('');
  renderStreakPetalGame();
  startStreakCountdown();
  syncPresenceUI();
}

function playBoing() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    const context = new Audio();
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(520, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(760, context.currentTime + .09);
    oscillator.frequency.exponentialRampToValueAtTime(390, context.currentTime + .24);
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.12, context.currentTime + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .28);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + .29);
    oscillator.onended = () => context.close();
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
      ? await sb.from('memory_likes').insert({ memory_id: item.id, user_id: me.id })
      : await sb.from('memory_likes').delete().eq('memory_id', item.id).eq('user_id', me.id);
    if (result.error) throw result.error;
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

  if (p === 'notes') {
    requestAnimationFrame(() => {
      if (page !== 'notes') return;
      const thread = $('#chatThread');
      if (thread) thread.scrollTop = thread.scrollHeight;
      notesHeaderLastScrollTop = thread?.scrollTop ?? null;
      syncNotesKeyboardLayout();
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

/* One reusable note message structure for the Notes conversation and Home history. */
function chatMessageMarkup(m, showMeta = true, isContinuation = false) {
  const owner = m.author || {};
  const ownerId = owner.id || m.owner_id || '';
  const mine = String(ownerId) === String(me?.id || '');
  const id = String(m.id);
  const liked = Number(m.like_count || 0) > 0;
  const messageValue = String(m.text || '');
  const messageCharacterCount = noteGraphemeSegmenter
    ? [...noteGraphemeSegmenter.segment(messageValue)].length
    : Array.from(messageValue).length;
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
  const senderTag = mine ? 'div' : 'button';
  const senderAttrs = mine ? '' : `type="button" data-friend-profile="${handle}" aria-label="Open ${name}'s profile"`;
  const senderMeta = showMeta ? `
        <${senderTag} class="chat-meta${mine ? '' : ' chat-sender-link'}" ${senderAttrs}>
          <span class="sender-pet" aria-hidden="true">${pet}</span>
          <b title="${name}">${name}</b>
          <small>@${handle}</small>
        </${senderTag}>
  ` : '';

  return `
    <div class="chat-message ${mine ? 'is-mine' : 'is-friend'}${liked ? ' is-loved' : ''}${m.isPending ? ' is-uploading' : ''}${isContinuation ? ' is-continuation' : ''}" data-kind="note" data-memory="${esc(id)}" data-owner="${esc(ownerId)}">
      <div class="chat-message-content">
        ${senderMeta}
        <div class="chat-message-line">
          <time class="chat-message-time" datetime="${esc(createdAt)}">${time}</time>
          <div class="chat-bubble-wrap">
            <div class="chat-bubble${hasHeartReaction ? '' : ' no-heart-reaction'}" tabindex="0" data-chat-message-id="${esc(id)}" aria-label="Message from ${name}">
              ${heartButton}
              <span class="chat-message-text" dir="auto">${messageText}</span>
            </div>
          </div>
        </div>
      </div>
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
    body = `<div class="tile${liked}">${heartButton}<div class="photo-frame"><img class="feed-photo" loading="lazy" decoding="async" data-media="${esc(m.id)}" ${m.previewUrl ? `src="${esc(m.previewUrl)}"` : ""} alt="Shared photo" role="button" tabindex="0" aria-label="Open full photo" draggable="false"></div></div>`;
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

/* Clean Notes conversation; message markup is shared with Home → Memory History. */
function renderNotesPage(options = {}) {
  const content = $('#content');
  if (!content) return;

  const chatNotes = feed
    .filter(m => m.kind === 'note' && !hiddenNoteIds.has(String(m.id)) && !pendingDeleteTimers.has(String(m.id)))
    .slice()
    .reverse();

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
    return divider + chatMessageMarkup(m, !isContinuation, isContinuation);
  }).join('');
  const emptyMarkup = '<div class="chat-empty"><span>💌</span><b>Your conversation starts here</b><small>Send the first little hello ♡</small></div>';
  const olderControl = historySentinelMarkup('top');
  const existingThread = $('#chatThread');

  // Update the existing scrollport in place so realtime refreshes never rebuild
  // the page or reset the reader's position in a long conversation.
  if (existingThread) {
    const threadRect = existingThread.getBoundingClientRect();
    const visibleTop = threadRect.top + existingThread.clientTop;
    const wasNearBottom =
      existingThread.scrollHeight - existingThread.scrollTop - existingThread.clientHeight < 72;
    const anchor = [...existingThread.querySelectorAll('.chat-message[data-memory]')]
      .find(message => message.getBoundingClientRect().bottom > visibleTop);
    const anchorId = anchor?.dataset.memory || '';
    const anchorOffset = anchor
      ? anchor.getBoundingClientRect().top - visibleTop
      : 0;
    const previousScrollTop = existingThread.scrollTop;

    existingThread.innerHTML = olderControl + (messagesHtml || emptyMarkup);

    requestAnimationFrame(() => {
      if (!existingThread.isConnected) return;
      if (options.followLatest || wasNearBottom) {
        existingThread.scrollTop = existingThread.scrollHeight;
      } else if (anchorId) {
        const nextAnchor = existingThread.querySelector(`[data-memory="${CSS.escape(anchorId)}"]`);
        if (nextAnchor) {
          const nextVisibleTop = existingThread.getBoundingClientRect().top + existingThread.clientTop;
          const nextOffset = nextAnchor.getBoundingClientRect().top - nextVisibleTop;
          existingThread.scrollTop += nextOffset - anchorOffset;
        } else {
          existingThread.scrollTop = Math.min(
            previousScrollTop,
            Math.max(0, existingThread.scrollHeight - existingThread.clientHeight)
          );
        }
      } else {
        existingThread.scrollTop = Math.min(
          previousScrollTop,
          Math.max(0, existingThread.scrollHeight - existingThread.clientHeight)
        );
      }
      syncNotesKeyboardLayout();
    });
    return;
  }

  content.innerHTML = `
    <section class="chat-page" aria-label="Notes conversation">
      <div class="chat-thread" id="chatThread" aria-live="polite">
        ${olderControl}${messagesHtml || emptyMarkup}
      </div>
      <form id="chatComposer" class="chat-composer" autocomplete="off">
        <textarea id="chatInput" class="input" maxlength="1000" rows="1" enterkeyhint="enter" inputmode="text" autocapitalize="sentences" spellcheck="true" aria-multiline="true" placeholder="Write a little message…" aria-label="Write a little message"></textarea>
        <button type="submit" class="primary" id="chatSend" aria-label="Send message" hidden>💌</button>
      </form>
    </section>
  `;

  requestAnimationFrame(() => {
    syncNotesKeyboardLayout();
    const thread = $('#chatThread');
    if (thread) thread.scrollTop = thread.scrollHeight;
  });
}
function render(options = {}) {
  const c = $('#content');
  if (!c) return;

  if (page === 'notes') {
    renderNotesPage({ followLatest: !!options.followLatest });
    requestAnimationFrame(() => { observeNotificationMemoryViews(); observeFeedHistory(); });
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
    c.innerHTML = `
      <div class="heading home-welcome"><h2>Welcome, ${esc(me?.displayName || 'friend')} ♡</h2><p>Your little shared corner for favorite things.</p></div>
      <div class="hero home-hero">
        <div>
          <small>✿ MADE FOR LITTLE MOMENTS</small>
          <h3>A little world to keep close</h3>
          <p>Four small corners for the moments you share together.</p>
          <button class="primary" data-go="friends">Find your friend ♡</button>
        </div>
        <button class="hero-art bunny-button" id="bunnyBuddy" aria-label="Open your profile">
          <span>☁️</span><span>${esc(me?.mascot || '🐰')}</span><span>🌷</span>
          <svg class="doodle-bouquet" viewBox="0 0 90 70" aria-hidden="true"><path d="M45 66Q35 42 20 27M45 66Q46 38 47 20M45 66Q56 42 72 30"/><path d="M39 54q-13-13-21-5 7 12 21 5M51 53q12-15 21-7-6 13-21 7"/><g class="bloom"><circle cx="20" cy="22" r="5"/><circle cx="14" cy="22" r="4"/><circle cx="26" cy="22" r="4"/><circle cx="20" cy="16" r="4"/><circle cx="20" cy="28" r="4"/></g><g class="bloom lavender"><circle cx="47" cy="16" r="5"/><circle cx="41" cy="16" r="4"/><circle cx="53" cy="16" r="4"/><circle cx="47" cy="10" r="4"/><circle cx="47" cy="22" r="4"/></g><g class="bloom peach"><circle cx="73" cy="27" r="5"/><circle cx="67" cy="27" r="4"/><circle cx="79" cy="27" r="4"/><circle cx="73" cy="21" r="4"/><circle cx="73" cy="33" r="4"/></g></svg>
          <i>✦</i>
        </button>
      </div>
      <div class="daily" id="dailyCard" role="button" tabindex="0" aria-label="A little kindness for today. Tap for another reminder">
        <span class="daily-icon">🌼</span><div><small>A LITTLE KINDNESS FOR TODAY</small><p id="compliment">${esc(getKindness())}</p></div>
      </div>
      <div class="toolbar"><h3>Your happy things</h3><span>${visibleFeed.length} shared memories</span></div>
      <div class="grid happy-things-grid">
        ${streakWidget()}
        <article class="tile"><button type="button" class="tile-art note-art happy-thing-art" data-happy-go="notes" aria-label="Open Little Love Notes">💌</button><h3>Little Love Notes</h3><p>${notes.length} saved notes</p><button class="primary" data-go="notes">Open notes →</button></article>
        <article class="tile"><button type="button" class="tile-art photo-art happy-thing-art" data-happy-go="gallery" aria-label="Open Photo Garden">🌸</button><h3>Photo Garden</h3><p>${pics.length} shared photos</p><button class="primary" data-go="gallery">Open photos →</button></article>
        <article class="tile"><button type="button" class="tile-art music-art happy-thing-art" data-happy-go="music" aria-label="Open Cozy Playlist">🎧<span>♫</span></button><h3>Cozy Playlist</h3><p>${songs.length} shared songs</p><button class="primary" data-go="music">Open music →</button></article>
      </div>
      <div class="feed-list">
        <h3>Your memory history</h3>
        ${visibleFeed.map((m, index) => {
          const previous = visibleFeed[index - 1];
          const ownerId = String(m.author?.id || m.owner_id || '');
          const previousOwnerId = String(previous?.author?.id || previous?.owner_id || '');
          const sameDay = previous && noteDayLabel(m.createdAt || m.created_at) === noteDayLabel(previous.createdAt || previous.created_at);
          const isContinuation = m.kind === 'note' && previous?.kind === 'note' && !!ownerId && ownerId === previousOwnerId && sameDay;
          return memoryCard(m, { isContinuation });
        }).join('') || '<div class="empty">Your shared scrapbook starts with one little note ♡</div>'}
        ${historySentinelMarkup('bottom')}
      </div>
    `;
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
      '<section class="own-profile-section"><div class="friend-section-title"><h3>Your profile</h3></div>',
      me ? friendRow(me, true) : '<div class="empty">Your profile is not available right now.</div>',
      '</section>',
      '<section class="following-list"><div class="friend-section-title"><h3>Your Friends</h3><span>' + friends.length + '</span></div>',
      friends.map(friendRow).join('') || '<div class="empty">Your circle is waiting for its first friend ♡</div>',
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

function showFriendProfile(user) {
  if (!user) return;
  const gate = $('#friendProfileGate');
  const isOwnProfile = String(user.id) === String(me?.id);
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
  const settingsTrigger = $('#profileSettingsTrigger');
  if (settingsTrigger) settingsTrigger.hidden = !isOwnProfile;
  const settingsPanel = $('#profileSettingsPanel');
  if (settingsPanel && !isOwnProfile) settingsPanel.classList.add('hidden');
  const profileOnline = isPresenceUserOnline(user.id, (() => { try { return presenceChannel?.presenceState?.() || {}; } catch { return {}; } })());
  const presenceDot = $('#friendProfilePresenceDot');
  $('#friendProfilePresence').textContent = profileOnline ? 'Active now' : formatFriendProfileActivity(user.last_active_at);
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
  $('#friendProfileFollow').textContent = isOwnProfile ? 'Themes' : (user.isFollowing ? 'Following' : 'Follow ♡');
  $('#friendProfileFollow').disabled = false;
  $('#friendProfileFollow').dataset.themeAction = isOwnProfile ? 'true' : 'false';
  $('#friendProfileFollow').classList.toggle('is-following', !!user.isFollowing);
  $('#friendProfileFollow').classList.toggle('is-own-profile', isOwnProfile);
  gate.classList.remove('hidden');
}


function renderProfileSettings() {
  const gender = me?.gender || '';
  document.querySelectorAll('[data-profile-gender]').forEach(button => { button.classList.toggle('is-selected', button.dataset.profileGender === gender); button.setAttribute('aria-pressed', String(button.dataset.profileGender === gender)); });
  const preview = $('#profileGenderPreview');
  if (preview) preview.textContent = gender === 'male' ? 'Preview: 👑 King' : gender === 'female' ? 'Preview: 👑 Queen' : 'Choose an option to preview your profile tag.';
  const prefs = me?.notification_preferences || {};
  const memory = $('#profileSettingMemoryNotifications'), buddy = $('#profileSettingBuddyNotifications');
  if (memory) memory.checked = prefs.memories !== false;
  if (buddy) buddy.checked = prefs.buddy !== false;
}
async function saveProfileSettings() {
  if (!me?.id) return;
  const save = $('#profileSettingsSave'), feedback = $('#profileSettingsFeedback');
  const gender = document.querySelector('[data-profile-gender].is-selected')?.dataset.profileGender || null;
  const notificationPreferences = { ...(me.notification_preferences || {}), memories: $('#profileSettingMemoryNotifications')?.checked !== false, buddy: $('#profileSettingBuddyNotifications')?.checked !== false };
  if (save) save.disabled = true;
  if (feedback) feedback.textContent = 'Saving your settings…';
  try {
    const saved = await api('/me', { method: 'PUT', body: JSON.stringify({ username: me.username, displayName: me.displayName || me.display_name, bio: me.bio || '', theme: me.theme || 'rose', mascot: me.mascot || '🐰', gender, notificationPreferences }) });
    me = { ...me, ...saved, gender, notification_preferences: saved.notification_preferences || notificationPreferences };
    const gate = $('#friendProfileGate');
    if (gate && !gate.classList.contains('hidden') && gate.dataset.ownProfile === 'true') showFriendProfile(me);
    renderProfileSettings();
    if (feedback) feedback.textContent = 'Your settings are saved ♡';
    toast('Profile settings saved ♡');
    render();
  } catch (error) {
    if (feedback) feedback.textContent = error.message || 'Could not save settings.';
    toast(error.message || 'Could not save settings.');
  } finally { if (save) save.disabled = false; }
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
    if (button) button.textContent = 'Themes';
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
  // Keep the current player and audio element alive while the next signed URL
  // is resolved; the previous song continues instead of flashing to empty.
  syncPlayer();
  try {
    const url = await resolveSongSource(track);
    if (requestId !== songLoadSequence) return;
    audio.src = url;
    audio.preload = 'auto';
    const playback = audio.play();
    syncPlayer();
    await playback;
    if (requestId !== songLoadSequence) return;
    syncPlayer();
  } catch (error) {
    if (requestId !== songLoadSequence) return;
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
  const gate = $('#photoLightbox'), image = $('#photoLightboxImage'), deleteButton = $('#photoLightboxDelete');
  const thumb = [...document.querySelectorAll('.feed-item[data-memory]')].find(node => node.dataset.memory === String(id))?.querySelector('.feed-photo');
  const canDelete = String(item.author?.id || item.owner_id || '') === String(me?.id || '') && !item.isPending;
  gate.dataset.memoryId = String(id);
  deleteButton.classList.toggle('hidden', !canDelete);
  deleteButton.setAttribute('aria-hidden', String(!canDelete));
  image.removeAttribute('src');
  gate.classList.remove('hidden');
  if (thumb?.getAttribute('src')) image.src = thumb.getAttribute('src');
  else if (thumb) {
    await hydrateOneMedia(thumb);
    if (gate.dataset.memoryId === String(id) && thumb.getAttribute('src')) image.src = thumb.getAttribute('src');
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
  popup.innerHTML = `
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
  const tempId = 'local-note-' + Date.now();
  const createdAt = new Date().toISOString();
  const optimistic = {
    id: tempId,
    kind: 'note',
    text,
    createdAt,
    created_at: createdAt,
    isPending: true,
    author: { ...me, id: me?.id, displayName: me?.displayName || me?.username, mascot: me?.mascot || '🐰' }
  };

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
    const saved = await api('/memories', { method: 'POST', body: JSON.stringify({ kind: 'note', text }) });
    const record = { ...saved, createdAt: saved.created_at, author: optimistic.author };
    feed = feed.map(m => String(m.id) === tempId ? record : m);
    renderNotesPage({ followLatest: true });
    refocusComposer();
  } catch (error) {
    feed = feed.filter(m => String(m.id) !== tempId);
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
  if (!document.hidden) void touchLastActive(true);
});

function startRealtime() {
  if (!sb || !me) return;
  closeRealtime();
  presenceStatus = 'connecting';
  try {
    // Each browser tab/device gets its own key; the user_id payload lets peers
    // aggregate all active sessions without key collisions.
    const clientPresenceKey = 'cb-' + String(me.id) + '-' +
      (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
    const presence = sb.channel('cute-bunny-presence', { config: { presence: { key: clientPresenceKey } } });
    presenceChannel = presence;
    presence
      .on('presence', { event: 'sync' }, syncPresenceUI)
      .on('presence', { event: 'join' }, syncPresenceUI)
      .on('presence', { event: 'leave' }, syncPresenceUI)
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          presenceStatus = 'ready';
          syncPresenceUI();
          try {
            await presence.track({ user_id: me.id, username: me.username, online_at: new Date().toISOString() });
            void touchLastActive(true);
          } catch (error) {
            presenceStatus = 'error';
            console.warn('Presence tracking failed:', error?.message || error);
            syncPresenceUI();
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          presenceStatus = 'error';
          syncPresenceUI();
        }
      });

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
      }).subscribe();

    notificationChannel = sb.channel('cute-bunny-notifications-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.' + me.id }, payload => {
        void loadNotifications().then(() => {
          const added = notificationRows.find(row => String(row.id) === String(payload?.new?.id)) || notificationRows[0];
          if (added) void showPhoneNotification(added);
          if (!$('#notificationGate').classList.contains('hidden')) renderNotifications();
        });
        toast('A little hello from your friend ♡');
      }).subscribe();

    memoryChannel = sb.channel('cute-bunny-memories-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'memories' }, payload => {
        // Refresh only the shared memory feed; a full app refresh can rebuild
        // the current page and interrupt the Notes conversation.
        clearTimeout(window.cuteMemoryRefresh);
        window.cuteMemoryRefresh = setTimeout(async () => {
          try {
            const freshFeed = await api('/feed');
            const pending = feed.filter(item => item.isPending);
            const pendingIds = new Set(pending.map(item => String(item.id)));
            feed = [...freshFeed.filter(item => !pendingIds.has(String(item.id))), ...pending];
            if (page === 'notes') renderNotesPage();
            else if (page === 'home') render();
          } catch (error) {
            console.warn('Live Notes update could not refresh the feed:', error?.message || error);
          }
        }, 120);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memory_likes' }, () => {
        clearTimeout(window.cuteMemoryLikesRefresh);
        window.cuteMemoryLikesRefresh = setTimeout(() => {
          refreshMemoryLikeIndicators().catch(error => console.warn('Live like refresh failed:', error?.message || error));
          api('/following').then(rows => {
            friends = rows;
            if (page === 'friends') render();
          }).catch(error => console.warn('Friend heart totals could not refresh:', error?.message || error));
        }, 90);
      }).subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('Live Notes channel status:', status);
        }
      });
  } catch (error) {
    presenceStatus = 'error';
    console.info('Realtime will start when supported.', error?.message || '');
    syncPresenceUI();
  }
}

function closeRealtime() {
  [presenceChannel, notificationChannel, memoryChannel, profileChannel].forEach(channel => {
    if (channel && sb) sb.removeChannel(channel);
  });
  presenceChannel = notificationChannel = memoryChannel = profileChannel = null;
  presenceStatus = 'closed';
  if (streakCountdownInterval) {
    window.clearInterval(streakCountdownInterval);
    streakCountdownInterval = null;
  }
}

function isPresenceUserOnline(userId, state) {
  if (!userId || !state || typeof state !== 'object') return false;
  return Object.values(state).some(sessions =>
    Array.isArray(sessions) && sessions.some(session => String(session?.user_id || '') === String(userId))
  );
}

function syncPresenceUI() {
  let state = {};
  try { state = presenceChannel?.presenceState?.() || {}; } catch {}
  const profileGate = $('#friendProfileGate');
  if (profileGate && !profileGate.classList.contains('hidden') && profileGate.dataset.username) {
    const profileUser = profileGate.dataset.ownProfile === 'true' ? me : [...friends, ...friendResults].find(user => user.username === profileGate.dataset.username);
    if (profileUser) {
      const online = isPresenceUserOnline(profileUser.id, state);
      const status = $('#friendProfilePresence');
      const dot = $('#friendProfilePresenceDot');
      if (status) status.textContent = online ? 'Active now' : formatFriendProfileActivity(profileUser.last_active_at);
      dot?.classList.toggle('is-online', online);
      dot?.classList.toggle('is-offline', !online);
      dot?.setAttribute('aria-label', online ? 'Online' : 'Offline');
    }
  }
  document.querySelectorAll('.sg-friend-card[data-friend-id], .friend-row[data-friend-id]').forEach(node => {
    const online = isPresenceUserOnline(node.dataset.friendId, state);
    node.classList.toggle('is-online', online);
    node.classList.toggle('is-offline', !online);
    const presenceLabel = node.querySelector('.sg-friend-presence');
    if (presenceLabel) {
      if (node.classList.contains('friend-row')) {
        const friend = [...friends, ...friendResults, ...(me ? [me] : [])].find(user => String(user.id) === String(node.dataset.friendId));
        presenceLabel.textContent = '';
      } else {
        presenceLabel.textContent = '';
      }
    }
  });
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
  if (!notification || !document.hidden || Notification.permission !== 'granted') return;
  let enabled = false;
  try { enabled = localStorage.getItem('cuteBunnyPhoneNotifications') === 'on'; } catch {}
  if (!enabled || !('serviceWorker' in navigator)) return;
  const prefs = me?.notification_preferences || {};
  if (notification.kind && prefs.memories === false) return;
  if (!notification.kind && prefs.buddy === false) return;
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
}

function renderNotifications() {
  const list = $('#notificationList');
  if (!list) return;
  const prefs = me?.notification_preferences || {};
  $('#notifyMemories').checked = prefs.memories !== false;
  $('#notifyBuddy').checked = prefs.buddy !== false;
  const previousScrollTop = list.scrollTop;
  list.innerHTML = notificationRows.map(n => {
    const actor = Array.isArray(n.actor) ? n.actor[0] : (n.actor || {});
    const unread = !n.read_at;
    return `<div class="notification-row${unread ? ' is-unread' : ''}" data-notification-row="${esc(n.id)}">
      <button type="button" class="notification-open" data-notification="${esc(n.id)}" aria-label="Open notification from ${esc(actor.display_name || actor.username || 'Friend')}">
        <span class="notification-avatar">${esc(actor.mascot || '🐰')}</span>
        <span class="notification-copy">
          <b>${esc(actor.display_name || actor.username || 'Friend')}</b>
          <small>@${esc(actor.username || 'friend')} · ${esc(n.message)}</small>
          <time>${esc(formatMessageTime(n.created_at))}</time>
        </span>
        ${unread ? '<i class="notification-unread-dot" aria-label="Unread"></i>' : ''}
      </button>
    </div>`;
  }).join('') || (notificationLoading && !notificationLoaded
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
  const ids = [...notificationViewedIds];
  notificationViewedIds.clear();
  for (const id of ids) {
    try { await dismissNotification(id, { silent: true }); } catch {}
  }
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
  if (mediaUrlCache.size > 40) {
    const oldestKey = mediaUrlCache.keys().next().value;
    const oldestEntry = mediaUrlCache.get(oldestKey);
    mediaUrlCache.delete(oldestKey);
    const oldestUrl = typeof oldestEntry === 'string' ? oldestEntry : oldestEntry?.url;
    if (oldestUrl?.startsWith('blob:')) URL.revokeObjectURL(oldestUrl);
  }
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
    // Serve a resized, compressed gallery rendition instead of downloading
    // the original camera image. Keep GIFs untouched to preserve animation.
    const storage = sb.storage.from('memories');
    const isGif = /image\/gif/i.test(memory.contentType || memory.content_type || '');
    let result = isGif
      ? await storage.createSignedUrl(memory.storagePath, 3600)
      : await storage.createSignedUrl(memory.storagePath, 3600, {
          transform: { width: 720, quality: 72, resize: 'contain' }
        });
    // If image transformations are unavailable for this bucket/plan, fall back
    // to the original signed URL so no photo becomes inaccessible.
    if (result.error && !isGif) result = await storage.createSignedUrl(memory.storagePath, 3600);
    if (result.error || !result.data?.signedUrl) throw result.error || new Error('The photo could not be loaded.');
    const url = result.data.signedUrl;
    const entry = { url, expiresAt: Date.now() + 3500000 };
    cacheMediaSource(key, entry);
    return url;
  })();

  mediaHydrationInFlight.set(key, request);
  try {
    return await request;
  } finally {
    if (mediaHydrationInFlight.get(key) === request) mediaHydrationInFlight.delete(key);
  }
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
    // Only the first few visible gallery images get high priority. Everything
    // else waits until it approaches the viewport.
    const prioritize = page === 'gallery' && index < 6;
    node.loading = prioritize ? 'eager' : 'lazy';
    node.decoding = 'async';
    node.fetchPriority = prioritize && index < 2 ? 'high' : 'auto';
  });
  if ('IntersectionObserver' in window) {
    mediaObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        mediaObserver.unobserve(entry.target);
        void hydrateOneMedia(entry.target);
      }
    }), { rootMargin: page === 'gallery' ? '700px 0px' : '320px 0px' });
    nodes.slice(0, page === 'gallery' ? 6 : 0).forEach(node => void hydrateOneMedia(node));
    nodes.slice(page === 'gallery' ? 6 : 0).forEach(node => mediaObserver.observe(node));
    if (page === 'music') warmSongSources(feed.filter(item => item.kind === 'song').slice(0, 8));
  } else nodes.forEach(node => void hydrateOneMedia(node));
}

function formatProfileDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  const month = new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
  return `${date.getDate()} ${month}, ${date.getFullYear()}`;
}

/* Event listeners */

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

// Open friend profiles from the card surface (but never from its Follow button).
document.addEventListener('click', event => {
  const row = event.target.closest('.friend-row[data-profile]');
  if (!row || event.target.closest('[data-follow]')) return;
  const username = row.dataset.profile;
  const friend = row.dataset.ownProfile === 'true' ? me : [...friends, ...friendResults].find(user =>
    String(user.id) === String(row.dataset.friendId) ||
    String(user.username || '').toLowerCase() === String(username || '').toLowerCase()
  );
  if (!friend) return;
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
  }, 420);
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

// Streak entry uses capture phase so card clicks cannot be swallowed by another page handler.
document.addEventListener('click', event => {
  let target = event.target;
  if (target && target.nodeType !== 1) target = target.parentElement;
  const retryButton = target?.closest('[data-streak-retry]');
  const streakButton = target?.closest('[data-open-streak]');
  if (!retryButton && !streakButton) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openStreakGarden();
}, true);

document.addEventListener('keydown', event => {
  const thumbnail = event.target?.closest?.('.streak-art-trigger[data-open-streak]');
  if (!thumbnail || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
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
  if (lastTouchMemoryTap.id === id && performance.now() - lastTouchMemoryTap.time <= 300) {
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
  if (id && lastTouchMemoryTap.id === id && now - lastTouchMemoryTap.time <= 260) {
    lastTouchMemoryTap = { id: '', time: 0, tile: null };
    suppressNativeMemoryDblclickUntil = now + 500;
    if (e.target.closest('.feed-photo')) {
      clearTimeout(photoPressState.clickTimer);
      photoPressState.clickTimer = null;
      photoPressState.pendingPhotoId = null;
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
    clearTimeout(bubbleTapState.timer);
    bubbleTapState.timer = null;
    bubbleTapState.bubble = null;
    if (!messagePressState.longPressed && !messagePressState.suppressClick) {
      void popLoveHeart(bubble, e);
    }
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
    const username = friendNoteItem.dataset.friendProfile;
    const f = friends.find(u => u.username === username);
    if (f) showFriendProfile(f);
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

  const streakFriendButton = e.target.closest('[data-streak-friend]');
  if (streakFriendButton) {
    const friend = friends.find(user => user.username === streakFriendButton.dataset.streakFriend);
    if (friend) showFriendProfile(friend);
    return;
  }
  const petalCard = e.target.closest('[data-streak-game-card]');
  if (petalCard) {
    flipStreakPetalCard(petalCard.dataset.streakGameCard);
    return;
  }

  const gardenTabButton = e.target.closest('[data-streak-garden-tab]');
  if (gardenTabButton) {
    const tabName = gardenTabButton.dataset.streakGardenTab;
    if (tabName !== 'milestones' && tabName !== 'promises') return;
    streakGardenActiveTab = tabName;
    const gardenTabs = gardenTabButton.closest('.streak-garden-page');
    gardenTabs?.querySelectorAll('[data-streak-garden-tab]').forEach(button => {
      const active = button.dataset.streakGardenTab === tabName;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    gardenTabs?.querySelectorAll('.sg-tab-panel').forEach(panel => {
      const active = panel.id === (tabName === 'milestones' ? 'sgMilestonesPanel' : 'sgPromisesPanel');
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

  // Mascot button
  if (e.target.closest('#bunnyBuddy')) {
    playBoing();
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
    $('#notificationGate').classList.remove('hidden');
    void loadNotifications().then(() => renderNotifications());
    return;
  }
  if (e.target.closest('#profileOpen, [data-open-profile]')) {
    if (!me) return;
    $('#profileName').textContent = me.displayName || me.username;
    $('#profileHandle').textContent = '@' + me.username;
    $('#profileCreated').textContent = formatProfileDate(me.created_at || me.createdAt);
    $('#profileDisplay').value = me.displayName || '';
    $('#profileUsername').value = me.username || '';
    $('#profileBio').value = me.bio || '';
    $('#profileTheme').value = me.theme || 'rose';
    $('#profileMascot').value = me.mascot || '🐰';
    updateThemePreview(me.theme || 'rose');
    updateBuddyChoices(me.mascot || '🐰');
    $('#profileGate').classList.remove('hidden');
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
          mascot: $('#profileMascot').value
        })
      });
      me = { ...me, ...updated };
      $('#profileName').textContent = me.displayName || username;
      $('#profileHandle').textContent = '@' + username;
      $('#topMascot').textContent = me.mascot || '🐰';
      $('#profileGate').classList.add('hidden');
      await refresh();
      syncPlayer();
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

  if (e.target.closest('#profileSettingsTrigger')) { renderProfileSettings(); $('#profileSettingsPanel')?.classList.remove('hidden'); return; }
  if (e.target.closest('#profileSettingsClose')) { $('#profileSettingsPanel')?.classList.add('hidden'); return; }
  const settingsTab = e.target.closest('[data-settings-tab]');
  if (settingsTab) { const selected = settingsTab.dataset.settingsTab; document.querySelectorAll('[data-settings-tab]').forEach(button => button.classList.toggle('is-active', button === settingsTab)); document.querySelectorAll('[data-settings-section]').forEach(section => section.classList.toggle('hidden', section.dataset.settingsSection !== selected)); return; }
  const genderChoice = e.target.closest('[data-profile-gender]');
  if (genderChoice) { document.querySelectorAll('[data-profile-gender]').forEach(button => button.classList.toggle('is-selected', button === genderChoice)); const preview = $('#profileGenderPreview'); if (preview) preview.textContent = genderChoice.dataset.profileGender === 'male' ? 'Preview: 👑 King' : 'Preview: 👑 Queen'; return; }
  if (e.target.closest('#profileSettingsSave')) { void saveProfileSettings(); return; }
  if (e.target.closest('#profileSettingsWallpaper')) { void cycleProfileWallpaper(); return; }

  // Friend search & profile & follow
  if (e.target.closest('#searchFriends')) {
    void searchFriends();
    return;
  }
  const friendLink = e.target.closest('[data-profile]');
  const friendCard = e.target.closest('.friend-row');
  if (friendLink || (friendCard && !e.target.closest('[data-follow]'))) {
    const profileTrigger = friendLink || friendCard.querySelector('[data-profile]');
    const friend = [...friends, ...friendResults].find(u => u.username === profileTrigger?.dataset.profile);
    if (friend) showFriendProfile(friend);
    return;
  }
  const followBtn = e.target.closest('#friendProfileFollow, [data-follow]');
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
    // Wait for a possible second click; a double-click is reserved for liking.
    clearTimeout(photoPressState.clickTimer);
    photoPressState.pendingPhotoId = String(id);
    photoPressState.clickTimer = setTimeout(() => {
      const pendingId = photoPressState.pendingPhotoId;
      photoPressState.clickTimer = null;
      photoPressState.pendingPhotoId = null;
      if (pendingId) void openPhotoLightbox(pendingId);
    }, 240);
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
      if (notification) await dismissNotification(notification.id);
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
      await api('/me', {
        method: 'PUT',
        body: JSON.stringify({
          notificationPreferences: { memories: $('#notifyMemories').checked, buddy: $('#notifyBuddy').checked }
        })
      });
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
  if (event.target.id !== 'chatInput') return;
  const field = event.target;
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

// Hide the masthead while reading downward and reveal it when scrolling upward.
document.addEventListener('scroll', event => {
  const thread = event.target;
  if (page !== 'notes' || thread?.id !== 'chatThread') return;

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
