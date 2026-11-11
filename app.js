const $ = s => document.querySelector(s), cfg = window.CUTE_BUNNY_CONFIG || {};
const sb = window.supabase && cfg.supabaseUrl && !cfg.supabaseUrl.startsWith('PASTE_')
  ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

let token = localStorage.getItem('cuteBunnyToken') || '', me = null, page = 'home', feed = [], friends = [], friendResults = [], friendQuery = '';
let appPageStack = ['home'], appBackGuardInstalled = false, appBackExitArmedUntil = 0, appBackExitPending = false;
let mediaObjectUrls = [], mediaUrlCache = new Map(), pendingMediaUrls = new Map(), reactedMemories = new Set();
let pendingDeleteTimers = new Map(), authMode = 'register';
let playlist = [], playlistIndex = -1, audioObjectUrl = '';
let notificationRows = [], notificationLoaded = false, notificationLoading = false;
let presenceChannel = null, notificationChannel = null, memoryChannel = null, profileChannel = null;
let activeMessageActionsId = null;
const messagePressState = { timer:null, bubble:null, pointerId:null, startX:0, startY:0, longPressed:false, suppressClick:false, suppressTimer:null };


const kindLines = [
  'You make ordinary days feel special ☀',
  'A little reminder: you are loved just as you are ♡',
  'Hope something makes you smile today 🌷',
  'You deserve a soft, cozy moment ☁',
  'You make the world kinder by being in it ✨',
  'Sending a pocket-sized hug your way 🐻',
  'I hope today brings you a tiny surprise 🌼',
  'You are someone’s favorite hello 💌',
  'Take your time. You are doing just fine 🍃',
  'May your day have snacks, sunshine, and zero worries 🍓',
  'You make people feel at home 🏡',
  'Remember to be as kind to yourself as you are to others 🌸',
  'You are allowed to rest and begin again ☁',
  'A little sparkle follows you wherever you go ✨',
  'You are wonderful in all your small, everyday ways ♡'
];

let currentKindnessIndex = new Date().getDate() % kindLines.length;
function getKindness() {
  return kindLines[currentKindnessIndex % kindLines.length];
}

function rollKindness(e) {
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
  if (e) {
    const rect = (e.currentTarget || e.target).getBoundingClientRect();

  }
  playBoing();
  toast('A little drop of kindness for you ♡');
}

function setMode(mode) {
  document.body.dataset.mode = mode;
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
        emailRedirectTo: 'https://whtankus.github.io/Cute-bunny/',
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
    const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
    fail(error);
    return { ...data, displayName: data.display_name };
  }

  if (path === '/me' && method === 'PUT') {
    const username = String(body.username || me?.username || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(username)) throw Error('Usernames need 3–24 letters, numbers, or underscores.');
    const update = {
      username,
      display_name: body.displayName,
      bio: body.bio,
      theme: body.theme,
      mascot: body.mascot,
      notification_preferences: body.notificationPreferences || me?.notification_preferences || { memories: true, buddy: true }
    };
    let { data, error } = await sb.from('profiles').update(update).eq('id', session.user.id).select().single();
    if (error) {
      if (username !== me?.username) throw Error('Run supabase/feature-upgrades.sql in Supabase before changing your username.');
      const fallback = await sb.from('profiles').update({
        display_name: body.displayName, bio: body.bio, theme: body.theme, mascot: body.mascot
      }).eq('id', session.user.id).select().single();
      fail(fallback.error);
      data = { ...fallback.data, notification_preferences: me?.notification_preferences || { memories: true, buddy: true }, featureUpgradeNeeded: true };
    }
    return { ...data, displayName: data.display_name };
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

  if (path === '/feed') {
    const rows = [], pageSize = 500;
    let start = 0;
    while (true) {
      const { data, error } = await sb.from('memories')
        .select('*,author:profiles!memories_owner_id_fkey(id,username,display_name,mascot,theme)')
        .order('created_at', { ascending: false }).order('id', { ascending: false })
        .range(start, start + pageSize - 1);
      fail(error);
      rows.push(...data);
      if (data.length < pageSize) break;
      start += pageSize;
    }
    return rows.map(m => {
      const author = Array.isArray(m.author) ? m.author[0] : (m.author || {});
      return {
        ...m,
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
    const fields = 'id,username,display_name,bio,theme,mascot,created_at,login_streak,last_login_date';
    const basic = 'id,username,display_name,bio,theme,mascot,created_at';
    let query = sb.from('profiles').select(fields).neq('id', session.user.id).order('username').limit(30);
    if (q) query = query.ilike('username', '%' + q + '%');
    let { data, error } = await query;
    if (error && /login_streak|last_login_date/i.test(error.message || '')) {
      query = sb.from('profiles').select(basic).neq('id', session.user.id).order('username').limit(30);
      if (q) query = query.ilike('username', '%' + q + '%');
      ({ data, error } = await query);
    }
    fail(error);
    const { data: edges, error: fe } = await sb.from('follows').select('followed_id').eq('follower_id', session.user.id);
    fail(fe);
    const followed = new Set(edges.map(x => x.followed_id));
    return data.map(u => ({ ...u, login_streak: Number(u.login_streak) || 0, displayName: u.display_name, isFollowing: followed.has(u.id) }));
  }

  if (path === '/following') {
    const basic = 'followed_id,created_at,followed:profiles!follows_followed_id_fkey(id,username,display_name,bio,theme,mascot,created_at)';
    const fields = 'followed_id,created_at,followed:profiles!follows_followed_id_fkey(id,username,display_name,bio,theme,mascot,created_at,login_streak,last_login_date)';
    let { data, error } = await sb.from('follows').select(fields).eq('follower_id', session.user.id).order('created_at', { ascending: false });
    if (error && /login_streak|last_login_date/i.test(error.message || '')) {
      ({ data, error } = await sb.from('follows').select(basic).eq('follower_id', session.user.id).order('created_at', { ascending: false }));
    }
    fail(error);
    return data.map(edge => {
      const u = Array.isArray(edge.followed) ? edge.followed[0] : edge.followed;
      return u ? ({ ...u, login_streak: Number(u.login_streak) || 0, displayName: u.display_name, isFollowing: true, followedAt: edge.created_at }) : null;
    }).filter(Boolean);
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
    const form = body, file = form.get('file'), kind = form.get('kind'), caption = form.get('caption') || file.name;
    if (file.size > 8 * 1024 * 1024) throw Error('Choose a file under 8 MB.');
    const photoTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], songTypes = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm'];
    if (!(kind === 'photo' ? photoTypes.includes(file.type) : kind === 'song' ? songTypes.includes(file.type) : false)) {
      throw Error(kind === 'photo' ? 'Choose a JPG, PNG, WebP, or GIF image.' : 'Choose an MP3, MP4, OGG, WAV, or WebM audio file.');
    }
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

function setTheme(theme) {
  document.body.dataset.theme = ['rose', 'lavender', 'mint', 'sky'].includes(theme) ? theme : 'rose';
}

function setUser(u) {
  if (me?.id !== u.id) {
    notificationRows = [];
    notificationLoaded = false;
    notificationLoading = false;
  }
  me = u;
  try {
    reactedMemories = new Set(JSON.parse(localStorage.getItem('cuteBunnyHearts:' + u.username) || '[]'));
  } catch {
    reactedMemories = new Set();
  }
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
  void loadNotifications();
}

async function refresh() {
  const results = await Promise.all([api('/me'), api('/feed'), api('/following')]);
  me = results[0];
  feed = results[1];
  friends = results[2];
  render();
  if (!$('#friendProfileGate').classList.contains('hidden')) {
    const profile = [...friends, ...friendResults].find(user => user.username === $('#friendProfileGate').dataset.username);
    if (profile) showFriendProfile(profile);
  }
}

const themeNames = { rose: 'Rose garden', lavender: 'Lavender skies', mint: 'Mint meadow', sky: 'Bluebird day' };

function formatMessageTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone, now = new Date(), yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const day = date.toDateString() === now.toDateString() ? 'Today' : date.toDateString() === yesterday.toDateString() ? 'Yesterday' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone }).format(date);
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone }).format(date);
  return day + ' · ' + time;
}

function formatNoteClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone }).format(date);
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
  return Number.isNaN(date.getTime()) ? 'A little while ago' : new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function friendRow(user) {
  return `<article class="friend-row" data-friend-id="${esc(user.id)}"><button class="friend-main" type="button" data-profile="${esc(user.username)}"><span class="friend-avatar">${esc(user.mascot || '🐰')}</span><span class="friend-copy"><b>${esc(user.displayName || user.display_name || user.username)}</b><small>@${esc(user.username)} · joined ${esc(formatJoinDate(user.created_at))}</small></span></button><button class="primary follow-btn" type="button" data-follow="${esc(user.username)}" data-following="${!!user.isFollowing}">${user.isFollowing ? 'Following ✓' : 'Follow ♡'}</button></article>`;
}

function streakBadge(count) {
  return count >= 30 ? '🌟 Love-garden legend' : count >= 7 ? '🌼 Week in bloom' : count >= 3 ? '🌱 Growing steadily' : count > 0 ? '🌷 First blossoms' : '✨ Fresh start';
}

function streakWidget() {
  const count = Math.max(0, Number(me?.login_streak) || 0), filled = count ? ((count - 1) % 7) + 1 : 0;
  const days = Array.from({ length: 7 }, (_, i) => `<span class="streak-day${i < filled ? ' is-filled' : ''}" aria-hidden="true">${i < filled ? '✿' : '·'}</span>`).join('');
  return `<article class="tile streak-widget" aria-label="Login streak: ${count} ${count === 1 ? 'day' : 'days'}"><div class="streak-top"><div class="tile-art streak-mascot" aria-hidden="true"><span class="streak-art-count" aria-label="${count} day streak">${count}<i aria-hidden="true">🔥</i></span></div><div class="streak-copy"><small>Your streak</small><strong>${count ? `${count} ${count === 1 ? 'day' : 'days'}` : 'Your first day'}</strong></div></div><p>${count ? count + (count === 1 ? ' day, Keep it going!' : ' days, Keep it going!') : 'Start your streak today ♡'}</p><div class="streak-progress" role="img" aria-label="${filled} of 7 days toward the next milestone">${days}</div><small class="streak-badge">${esc(streakBadge(count))}</small><button type="button" class="primary streak-profile-link" data-open-profile>Open profile →</button></article>`;
}

function recordLoginStreak() {
  if (!me) return;
  const userId = me.id, key = 'cuteBunnyStreak:' + userId, today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(`${today}T00:00:00.000Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  const serverDate = String(me.last_login_date || '').slice(0, 10);
  const serverCount = Math.max(0, Number(me.login_streak) || 0);
  let saved = { count: 0, date: '' };
  try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
  let localCount;
  if (serverDate === today) localCount = serverCount || 1;
  else if (serverDate === yesterday) localCount = serverCount + 1;
  else if (serverDate) localCount = 1;
  else if (saved.date === today) localCount = Math.max(1, Number(saved.count) || 1);
  else if (saved.date === yesterday) localCount = Math.max(1, Number(saved.count) || 0) + 1;
  else localCount = 1;
  me.login_streak = localCount;
  me.last_login_date = today;
  try { localStorage.setItem(key, JSON.stringify({ count: localCount, date: today })); } catch {}
  if (!sb) return;
  void sb.rpc('record_login_streak').then(({ data, error }) => {
    if (error) throw error;
    if (me?.id !== userId) return;
    const result = Array.isArray(data) ? data[0] : data;
    const count = Math.max(1, Number(result?.login_streak) || localCount);
    const date = String(result?.last_login_date || today).slice(0, 10);
    me.login_streak = count;
    me.last_login_date = date;
    try { localStorage.setItem(key, JSON.stringify({ count, date })); } catch {}
  }).catch(() => {});
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

function popLoveHeart(card, e) {
  if (!card) return;
  const id = card.closest('[data-memory]')?.dataset.memory;
  if (id) {
    const key = String(id);
    reactedMemories.has(key) ? reactedMemories.delete(key) : reactedMemories.add(key);
    try {
      localStorage.setItem('cuteBunnyHearts:' + me?.username, JSON.stringify([...reactedMemories].slice(-2000)));
    } catch {}
    const likedNow = reactedMemories.has(key);
    const message = card.closest('.chat-message');
    card.classList.toggle('is-loved', likedNow);
    message?.classList.toggle('is-loved', likedNow);
    const control = card.closest('.feed-item')?.querySelector('[data-memory-heart]') || message?.querySelector('[data-memory-heart]');
    if (control) {
      control.textContent = likedNow ? '♥' : '♡';
      control.setAttribute('aria-pressed', String(likedNow));
      control.setAttribute('aria-label', likedNow ? (message ? 'Unlike message' : 'Unlike memory') : (message ? 'Like message' : 'Like memory'));
    }

  }
  card.classList.remove('heart-tap');
  void card.offsetWidth;
  card.classList.add('heart-tap');
  clearTimeout(card.heartTimer);
  card.heartTimer = setTimeout(() => card.classList.remove('heart-tap'), 1050);
  const rect = card.getBoundingClientRect();
  const x = e?.clientX || (rect.left + rect.width / 2);
  const y = e?.clientY || (rect.top + rect.height / 2);

}

function go(p, options = {}) {
  const validPages = ['home', 'gallery', 'music', 'notes', 'friends'];
  if (!validPages.includes(p)) return;
  if (options.resetStack) appPageStack = [p];
  else if (!options.fromBack && p !== page && appBackGuardInstalled) appPageStack.push(p);

  if (page === 'notes' && p !== 'notes') {
    $('#chatInput')?.blur();
    document.querySelector('.chat-page')?.classList.remove('notes-keyboard-open');
    document.body.classList.remove('notes-keyboard-open');
    document.body.classList.remove('notes-page-active');
    document.documentElement.style.setProperty('--notes-keyboard-inset', '0px');
    document.documentElement.style.removeProperty('--notes-page-height');
    document.documentElement.style.removeProperty('--notes-nav-height');
  }

  page = p;
  $('#crumb').textContent = ({ home: 'Home', gallery: 'Photos', music: 'Music', notes: 'Notes', friends: 'Friends' })[p];
  document.querySelectorAll('#nav button[data-page]').forEach(b => {
    const isCurrentPage = b.dataset.page === p;
    b.classList.toggle('active', isCurrentPage);
    if (isCurrentPage) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  hideMessageActions();
  document.body.classList.toggle('notes-page-active', p === 'notes');
  // Start Notes at the app's top-level header rather than inheriting another
  // page's document scroll position.
  window.scrollTo({ top: 0, behavior: 'auto' });
  render();

  if (p === 'notes') {
    requestAnimationFrame(() => {
      if (page !== 'notes') return;
      const thread = $('#chatThread');
      if (thread) thread.scrollTop = thread.scrollHeight;
      syncNotesKeyboardLayout();
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

  // At Home, show an exit hint. A second Back within 2.3 seconds leaves the app.
  const now = Date.now();
  if (now <= appBackExitArmedUntil) {
    appBackExitArmedUntil = 0;
    appBackExitPending = true;
    history.back();
    return;
  }
  appBackExitArmedUntil = now + 2300;
  toast('You are at Home · Press back again to exit.');
  pushAppBackGuard();
}

window.addEventListener('popstate', handleAppBackNavigation);

/* One reusable note message structure for the Notes conversation and Home history. */
function chatMessageMarkup(m, showMeta = true, isContinuation = false) {
  const owner = m.author || {};
  const ownerId = owner.id || m.owner_id || '';
  const mine = String(ownerId) === String(me?.id || '');
  const id = String(m.id);
  const liked = reactedMemories.has(id);
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
            <div class="chat-bubble" tabindex="0" data-chat-message-id="${esc(id)}" aria-label="Message from ${name}">
              <button type="button" class="memory-heart-toggle" data-memory-heart="${esc(id)}" aria-label="${liked ? 'Unlike' : 'Like'} message" aria-pressed="${liked}">${liked ? '♥' : '♡'}</button>
              <span class="chat-message-text" dir="auto">${messageText}</span>
            </div>
          </div>
        </div>
      </div>
      ${m.isPending ? '<span class="memory-upload-status" role="status">Sending your message…</span>' : ''}
    </div>
  `;
}

function memoryCard(m) {
  const owner = m.author || {};
  const name = esc(owner.displayName || owner.display_name || 'Friend');
  const handle = esc(owner.username || '');
  const pet = esc(owner.mascot || '🐰');
  const liked = reactedMemories.has(String(m.id)) ? ' is-loved' : '';
  const isLiked = reactedMemories.has(String(m.id));
  const heartButton = `<button type="button" class="memory-heart-toggle" data-memory-heart="${esc(m.id)}" aria-label="${isLiked ? 'Unlike' : 'Like'} memory" aria-pressed="${isLiked}">${isLiked ? '♥' : '♡'}</button>`;
  const sorted = [me?.id, ...friends.map(f => f.id)].filter(Boolean).map(String).sort();
  const tone = sorted.indexOf(String(owner.id || m.owner_id || '')) % 2 ? 'tone-lavender' : 'tone-peach';
  const pending = pendingDeleteTimers.has(String(m.id)) ? ' is-pending-delete' : '';
  const uploading = m.isPending ? ' is-uploading' : '';
  const mine = String(owner.id || m.owner_id || '') === String(me?.id || '');

  let body = '';
  if (m.kind === 'photo') {
    body = `<div class="tile${liked}">${heartButton}<div class="photo-frame"><img class="feed-photo" data-media="${esc(m.id)}" ${m.previewUrl ? `src="${esc(m.previewUrl)}"` : ""} alt="Shared photo" role="button" tabindex="0" aria-label="Open full photo" draggable="false"></div></div>`;
  } else if (m.kind === 'song') {
    body = `<div class="tile song-card${liked}">${heartButton}<button class="album-art play-song" data-play-song="${esc(m.id)}" aria-label="Play ${esc(m.fileName || 'song')}" aria-pressed="false" ${m.isPending ? "disabled" : ""}><span class="song-glyph" aria-hidden="true">🎼</span><span class="song-note" aria-hidden="true">♫</span></button><span class="memory-title song-title-label" title="${esc(m.fileName || m.text || 'A little song')}">${esc(m.fileName || m.text || 'A little song')}</span>${m.isPending ? "" : `<button class="song-download card-song-save" type="button" data-memory-download="${esc(m.id)}" aria-label="Save song">Save</button>`}</div>`;
  } else {
    body = chatMessageMarkup(m);
  }

  const authorLine = m.kind === 'note' ? '' : `<div class="feed-by"><span class="sender-pet" aria-label="${pet}">${pet}</span> <b title="${name}">${name}</b> <small>@${handle}</small></div>`;
  const ownerIndicator = mine && m.kind !== 'note' ? `<span class="memory-owner-indicator" aria-hidden="true">Your memory</span>` : '';
  return `<article class="feed-item ${tone}${pending}${uploading}${m.kind === 'note' ? ' home-note-memory' : ''}" data-kind="${esc(m.kind)}" data-memory="${esc(m.id)}" data-owner="${esc(owner.id || m.owner_id || '')}">${authorLine}${body}${ownerIndicator}</article>`;
}

/* Clean Notes conversation; message markup is shared with Home → Memory History. */
function renderNotesPage(options = {}) {
  const content = $('#content');
  if (!content) return;

  const chatNotes = feed
    .filter(m => m.kind === 'note' && !pendingDeleteTimers.has(String(m.id)))
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

    existingThread.innerHTML = messagesHtml || emptyMarkup;

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
        ${messagesHtml || emptyMarkup}
      </div>
      <form id="chatComposer" class="chat-composer" autocomplete="off">
        <textarea id="chatInput" class="input" maxlength="1000" rows="1" enterkeyhint="enter" inputmode="text" autocapitalize="sentences" spellcheck="true" aria-multiline="true" placeholder="Write a little message…" aria-label="Write a little message"></textarea>
        <button type="submit" class="primary" id="chatSend" aria-label="Send message" hidden>💌</button>
      </form>
    </section>
  `;

  requestAnimationFrame(() => {
    const thread = $('#chatThread');
    if (thread) thread.scrollTop = thread.scrollHeight;
    syncNotesKeyboardLayout();
  });
}
function render() {
  const c = $('#content');
  if (!c) return;

  if (page === 'notes') {
    renderNotesPage();
    return;
  }

  const visibleFeed = feed.filter(x => !pendingDeleteTimers.has(String(x.id)));
  const pics = visibleFeed.filter(x => x.kind === 'photo');
  const songs = visibleFeed.filter(x => x.kind === 'song');
  const notes = visibleFeed.filter(x => x.kind === 'note');

  if (page === 'home') {
    c.innerHTML = `
      <div class="heading"><h2>Welcome, ${esc(me?.displayName || 'friend')} ♡</h2><p>Your little shared corner for favorite things.</p></div>
      <div class="hero">
        <div>
          <small>✿ MADE FOR LITTLE MOMENTS</small>
          <h3>Welcome to the memory garden</h3>
          <p>Share photos, songs, and sweet notes with your friend.</p>
          <button class="primary" data-go="friends">Find your friend ♡</button>
        </div>
        <button class="hero-art bunny-button" id="bunnyBuddy" aria-label="Open your profile">
          <span>☁️</span><span>${esc(me?.mascot || '🐰')}</span><span>🌷</span>
          <svg class="doodle-bouquet" viewBox="0 0 90 70" aria-hidden="true"><path d="M45 66Q35 42 20 27M45 66Q46 38 47 20M45 66Q56 42 72 30"/><path d="M39 54q-13-13-21-5 7 12 21 5M51 53q12-15 21-7-6 13-21 7"/><g class="bloom"><circle cx="20" cy="22" r="5"/><circle cx="14" cy="22" r="4"/><circle cx="26" cy="22" r="4"/><circle cx="20" cy="16" r="4"/><circle cx="20" cy="28" r="4"/></g><g class="bloom lavender"><circle cx="47" cy="16" r="5"/><circle cx="41" cy="16" r="4"/><circle cx="53" cy="16" r="4"/><circle cx="47" cy="10" r="4"/><circle cx="47" cy="22" r="4"/></g><g class="bloom peach"><circle cx="73" cy="27" r="5"/><circle cx="67" cy="27" r="4"/><circle cx="79" cy="27" r="4"/><circle cx="73" cy="21" r="4"/><circle cx="73" cy="33" r="4"/></g></svg>
          <i>✦</i>
        </button>
      </div>
      <div class="daily" id="dailyCard" role="button" tabindex="0" aria-label="A little kindness for today. Tap for a fresh reminder">
        <span class="daily-icon">🌼</span>
        <div>
          <small>A LITTLE KINDNESS FOR TODAY</small>
          <p id="compliment">${esc(getKindness())}</p>
        </div>
        <button class="round" id="newCompliment" aria-label="New kindness reminder">↻</button>
      </div>
      <div class="toolbar"><h3>Your happy things</h3><span>${visibleFeed.length} shared memories</span></div>
      <div class="grid happy-things-grid">
        <article class="tile"><div class="tile-art photo-art">🌸</div><h3>Photo garden</h3><p>${pics.length} shared photos</p><button class="primary" data-go="gallery">Open photos →</button></article>
        <article class="tile"><div class="tile-art music-art">🎧<span>♫</span></div><h3>Cozy playlist</h3><p>${songs.length} shared songs</p><button class="primary" data-go="music">Open music →</button></article>
        <article class="tile"><div class="tile-art note-art">💌</div><h3>Little love notes</h3><p>${notes.length} saved notes</p><button class="primary" data-go="notes">Open notes →</button></article>
        ${streakWidget()}
      </div>
      <div class="feed-list">
        <h3>Your memory history</h3>
        ${feed.map(memoryCard).join('') || '<div class="empty">Your shared scrapbook starts with one little note ♡</div>'}
      </div>
    `;
  } else if (page === 'gallery') {
    c.innerHTML = `
      <div class="heading"><h2>Photo garden 🌷</h2><p>Little snapshots, shared with your friend.</p></div>
      <label class="primary upload-label">＋ Add photo<input data-upload="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>
      <section class="photo-garden-grid" aria-label="Shared photo garden">${pics.map(memoryCard).join('') || '<div class="empty">Your garden is waiting for its first photo ♡</div>'}</section>
    `;
  } else if (page === 'music') {
    c.innerHTML = `
      <div class="heading"><h2>Cozy music 🎵</h2><p>Your songs play right here in the garden.</p></div>
      <label class="primary upload-label">＋ Add a song<input data-upload="song" type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm" hidden></label>
      <h3 class="shared-songs-title">Your shared songs</h3>
      <div class="grid media-grid music-grid">${songs.map(memoryCard).join('') || '<div class="empty">Add a song file and listen together right here ♡</div>'}</div>
    `;
  } else if (page === 'friends') {
    c.innerHTML = `
      <div class="heading"><h2>Your little circle 🐰</h2><p>Find a friend, then keep your favorite things together.</p></div>
      <div class="friend-search"><input class="input" id="friendSearch" value="${esc(friendQuery)}" placeholder="Search username…"><button class="primary" id="searchFriends">Find</button></div>
      <section class="following-list">
        <div class="friend-section-title"><h3>People you follow</h3><span>${friends.length}</span></div>
        ${friends.map(friendRow).join('') || '<div class="empty">Your circle is waiting for its first friend ♡</div>'}
      </section>
      <section class="friend-results-section">
        <div class="friend-section-title"><h3>Find new friends</h3></div>
        <div id="friendResults">${friendResults.map(friendRow).join('') || '<div class="empty">Search a username to peek at their profile ♡</div>'}</div>
      </section>
    `;
  }
  hydrateMedia();
}

function showFriendProfile(user) {
  if (!user) return;
  const gate = $('#friendProfileGate');
  gate.dataset.username = user.username;
  gate.dataset.following = String(!!user.isFollowing);
  $('#friendProfileBuddy').textContent = user.mascot || '🐰';
  $('#friendProfileName').textContent = user.displayName || user.display_name || user.username;
  $('#friendProfileHandle').textContent = '@' + user.username;
  $('#friendProfileBio').textContent = user.bio || 'A little mystery friend ♡';
  $('#friendProfileCreated').textContent = 'Joined ' + formatJoinDate(user.created_at);
  $('#friendProfileStyle').dataset.themePreview = user.theme || 'rose';
  $('#friendProfileThemeName').textContent = themeNames[user.theme] || 'Rose garden';
  $('#friendProfileFollow').textContent = user.isFollowing ? 'Following ✓' : 'Follow ♡';
  $('#friendProfileFollow').classList.toggle('is-following', !!user.isFollowing);
  gate.classList.remove('hidden');
}

async function toggleFriendFollow(username, isFollowing) {
  const beforeFriends = friends.slice(), beforeResults = friendResults.slice();
  const found = [...friends, ...friendResults].find(user => user.username === username) || { username, displayName: username, mascot: '🐰' };
  const next = !isFollowing;
  friends = next ? [...friends.filter(user => user.username !== username), { ...found, isFollowing: true }] : friends.filter(user => user.username !== username);
  friendResults = friendResults.map(user => user.username === username ? { ...user, isFollowing: next } : user);
  const gate = $('#friendProfileGate');
  if (gate.dataset.username === username) {
    gate.dataset.following = String(next);
    $('#friendProfileFollow').textContent = next ? 'Following ✓' : 'Follow ♡';
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
      $('#friendProfileFollow').textContent = isFollowing ? 'Following ✓' : 'Follow ♡';
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
    const title = track.fileName || track.text || 'A little song', currentStatus = String(me?.bio || 'Listening together').trim() || 'Listening together';
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

async function playSong(id) {
  const songs = feed.filter(x => x.kind === 'song'), index = songs.findIndex(x => String(x.id) === String(id)), audio = $('#globalAudio');
  if (index < 0) return toast('This song is no longer in your garden ♡');
  if (String(playlist[playlistIndex]?.id) === String(id) && audio.src) {
    if (audio.paused) await audio.play().catch(() => {});
    else audio.pause();
    syncPlayer();
    return;
  }
  playlist = songs;
  playlistIndex = index;
  const track = songs[index];
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
  syncPlayer();
  try {
    const { data, error } = await sb.storage.from('memories').download(track.storagePath);
    if (error) throw error;
    audioObjectUrl = URL.createObjectURL(data);
    audio.src = audioObjectUrl;
    await audio.play();
    syncPlayer();
  } catch (e) {
    toast(e.message || 'Could not play this song right now ♡');
  }
}

function stepSong(step) {
  if (!playlist.length) return;
  playlistIndex = (playlistIndex + step + playlist.length) % playlist.length;
  void playSong(playlist[playlistIndex].id);
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

  const canDelete = String(item.author?.id || item.owner_id || '') === String(me?.id || '') && !item.isPending;
  $('#memoryDelete').classList.toggle('hidden', !canDelete);
  // Clean delete text without dustbin box / emoji
  $('#memoryDelete').textContent = isNote ? 'Delete note' : item.kind === 'song' ? 'Delete song' : 'Delete photo';
  $('#memoryCopy').classList.toggle('hidden', !isNote);
  $('#memoryActionKicker').textContent = isPhoto ? 'A LITTLE PHOTO' : isNote ? 'A LITTLE NOTE' : 'A SONG TO KEEP';
  $('#memoryActionTitle').textContent = isPhoto ? 'A lovely moment' : isNote ? 'A note to keep' : (item.fileName || 'A little song');
  $('#memoryActionText').textContent = isPhoto ? 'Keep this sweet moment on your device?' : isNote ? 'Copy this message or delete it softly?' : 'Save this song file for later?';
  $('#memoryDownload').textContent = isPhoto ? 'Save photo' : item.kind === 'song' ? 'Save song' : 'Save';
  $('#memoryDownload').classList.toggle('hidden', isNote);

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
  const popup = document.createElement('div');
  popup.className = 'chat-actions-popup';
  popup.setAttribute('role', 'toolbar');
  popup.setAttribute('aria-label', 'Message options');
  popup.innerHTML = `
    <button type="button" class="chat-action-btn" data-chat-copy="${esc(id)}">Copy</button>
    <button type="button" class="chat-action-btn delete-btn" data-chat-delete="${esc(id)}">Delete</button>
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
        audio.pause();
        audio.removeAttribute('src');
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
function startRealtime() {
  if (!sb || !me) return;
  try {
    presenceChannel = sb.channel('cute-bunny-presence', { config: { presence: { key: me.id } } })
      .on('presence', { event: 'sync' }, syncPresenceUI)
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') await presenceChannel.track({ username: me.username, online_at: new Date().toISOString() });
      });

    profileChannel = sb.channel('cute-bunny-profiles-' + me.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, payload => {
        if (payload.new?.id !== me.id) void refresh();
      }).subscribe();

    notificationChannel = sb.channel('cute-bunny-notifications-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.' + me.id }, () => {
        void loadNotifications();
        if (!$('#notificationGate').classList.contains('hidden')) renderNotifications();
        toast('A little hello from your friend ♡');
      }).subscribe();

    memoryChannel = sb.channel('cute-bunny-memories-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'memories' }, () => {
        clearTimeout(window.cuteMemoryRefresh);
        window.cuteMemoryRefresh = setTimeout(() => void refresh(), 600);
      }).subscribe();
  } catch (error) {
    console.info('Realtime will start when supported.', error?.message || '');
  }
}

function closeRealtime() {
  [presenceChannel, notificationChannel, memoryChannel, profileChannel].forEach(channel => {
    if (channel) sb.removeChannel(channel);
  });
  presenceChannel = notificationChannel = memoryChannel = profileChannel = null;
}

function syncPresenceUI() {
  if (!presenceChannel) return;
  const state = presenceChannel.presenceState();
  document.querySelectorAll('[data-friend-id]').forEach(node => {
    node.classList.toggle('is-online', !!state[node.dataset.friendId]?.length);
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
  } catch {}
  finally {
    if (me?.id === req) {
      notificationLoading = false;
      if (!$('#notificationGate').classList.contains('hidden')) renderNotifications();
    }
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
  list.innerHTML = notificationRows.map(n => {
    const actor = Array.isArray(n.actor) ? n.actor[0] : (n.actor || {});
    return `<button class="notification-row${n.read_at ? '' : ' is-unread'}" data-notification="${esc(n.id)}" data-kind="${esc(n.kind)}" data-memory="${esc(n.memory_id || '')}"><span class="notification-avatar">${esc(actor.mascot || '🐰')}</span><span><b>${esc(actor.display_name || actor.username || 'Friend')}</b><small>@${esc(actor.username || 'friend')} · ${esc(n.message)}</small><time>${esc(formatMessageTime(n.created_at))}</time></span>${n.read_at ? '' : '<i>♡</i>'}</button>`;
  }).join('') || (notificationLoading && !notificationLoaded ? '<div class="notification-loading" aria-label="Loading notifications"><span class="notification-loader" aria-hidden="true"></span></div>' : '<div class="notification-empty"><span aria-hidden="true">♡</span><b>You’re all caught up</b><small>New shared activity will appear here.</small></div>');
}

async function markNotificationRead(id) {
  const row = notificationRows.find(n => String(n.id) === String(id));
  if (!row || row.read_at) return;
  await api('/notifications/read', { method: 'PUT', body: JSON.stringify({ ids: [id] }) });
  row.read_at = new Date().toISOString();
  updateNotificationBadge();
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

async function hydrateOneMedia(node) {
  try {
    const m = feed.find(x => String(x.id) === node.dataset.media);
    if (!m?.storagePath || m.isPending) return;
    const key = String(m.id), cached = mediaUrlCache.get(key);
    if (cached) {
      node.src = cached;
      return;
    }
    const { data, error } = await sb.storage.from('memories').download(m.storagePath);
    if (!error && data) {
      const url = URL.createObjectURL(data);
      mediaUrlCache.set(key, url);
      if (mediaUrlCache.size > 40) {
        const oldest = mediaUrlCache.keys().next().value, expired = mediaUrlCache.get(oldest);
        mediaUrlCache.delete(oldest);
        URL.revokeObjectURL(expired);
      }
      node.src = url;
    }
  } catch {}
}

function hydrateMedia() {
  if (!sb) return;
  const nodes = [...document.querySelectorAll('[data-media]')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        void hydrateOneMedia(entry.target);
      }
    }), { rootMargin: '320px 0px' });
    nodes.forEach(node => observer.observe(node));
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
document.addEventListener('pointerdown', e => {
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
    if (e.target.id === 'photoLightbox') closePhotoLightbox();
    if (e.target.id === 'memoryActionGate') closeMemoryActions();
    return;
  }

  // Dismiss message actions popup if clicking outside
  if (!e.target.closest('.chat-actions-popup') && !e.target.closest('.chat-bubble')) {
    hideMessageActions();
  }

  // Dismiss now playing panel if clicking outside island
  const island = $('#nowPlayingIsland');
  if (island && !island.classList.contains('hidden') && !$('#nowPlayingPanel')?.classList.contains('hidden')) {
    if (!e.target.closest('#nowPlayingIsland')) toggleMusicIsland(false);
  }
});

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
  }, 120);
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

// Main delegation
document.addEventListener('click', async e => {
  // Kindness card & button
  if (e.target.closest('#dailyCard') || e.target.closest('#newCompliment')) {
    rollKindness(e);
    return;
  }

  // Heart toggle
  const heart = e.target.closest('[data-memory-heart]');
  if (heart) {
    e.preventDefault();
    e.stopPropagation();
    const card = heart.closest('.chat-message')?.querySelector('.chat-bubble') || heart.closest('.feed-item .tile');
    if (card) popLoveHeart(card, e);
    return;
  }

  // A short tap on a Notes bubble likes/unlikes it. Long-press is handled above.
  const bubble = e.target.closest('.chat-page .chat-bubble, .home-note-memory .chat-bubble');
  const selectedText = window.getSelection?.()?.toString().trim();
  if (bubble && !e.target.closest('button') && !selectedText) {
    if (messagePressState.suppressClick) {
      messagePressState.suppressClick = false;
      clearTimeout(messagePressState.suppressTimer);
      messagePressState.suppressTimer = null;
      messagePressState.longPressed = false;
      return;
    }
    popLoveHeart(bubble, e);
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

  // Navigation: one delegated route per click, with no redundant rerender of the current page.
  const nav = e.target.closest('#nav button[data-page]');
  if (nav) {
    e.preventDefault();
    if (nav.dataset.page !== page) go(nav.dataset.page);
    return;
  }
  const goBtn = e.target.closest('[data-go]');
  if (goBtn) {
    go(goBtn.dataset.go);
    return;
  }

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

  // Friend search & profile & follow
  if (e.target.closest('#searchFriends')) {
    void searchFriends();
    return;
  }
  const friendLink = e.target.closest('[data-profile]');
  if (friendLink) {
    showFriendProfile([...friends, ...friendResults].find(u => u.username === friendLink.dataset.profile));
    return;
  }
  const followBtn = e.target.closest('#friendProfileFollow, [data-follow]');
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
  const downloadBtn = e.target.closest('[data-memory-download]');
  if (downloadBtn) {
    void downloadMemoryById(downloadBtn.dataset.memoryDownload, downloadBtn);
    return;
  }

  // Photo open & lightbox controls
  const photo = e.target.closest('.feed-photo');
  if (photo) {
    const id = photo.closest('.feed-item')?.dataset.memory;
    if (id) void openPhotoLightbox(id);
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
  if (e.target.closest('#notificationsReadAll')) {
    try {
      await api('/notifications/read-all', { method: 'PUT' });
      await loadNotifications();
      renderNotifications();
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  const notifItem = e.target.closest('[data-notification]');
  if (notifItem) {
    try {
      await markNotificationRead(notifItem.dataset.notification);
      renderNotifications();
    } catch (err) {
      toast(err.message);
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

// Resize only the Notes conversation viewport when the mobile keyboard appears.
// The app header and its profile / notification / moon controls are not repositioned.
function syncNotesKeyboardLayout() {
  const notesPage = document.querySelector('.chat-page');
  if (!notesPage || page !== 'notes') {
    document.body.classList.remove('notes-keyboard-open');
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
  if (event.target.id === 'chatInput') scheduleNotesKeyboardLayout();
});
document.addEventListener('focusout', event => {
  if (event.target.id === 'chatInput') scheduleNotesKeyboardLayout();
});
window.addEventListener('resize', scheduleNotesKeyboardLayout);
window.addEventListener('orientationchange', scheduleNotesKeyboardLayout);
window.visualViewport?.addEventListener('resize', scheduleNotesKeyboardLayout);
window.visualViewport?.addEventListener('scroll', scheduleNotesKeyboardLayout);

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
