/* friends feature functions; classic-script compatibility with current app state. */
'use strict';

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
    {goal:3, title:'Tiny Sprout'},
    {goal:7, title:'First Bloom'},
    {goal:14, title:'Little Garden'},
    {goal:30, title:'Growing Together'},
    {goal:50, title:'Golden Bouquet'},
    {goal:100, title:'Everlasting Garden'}
  ];
    const heartMilestones = [
    {goal:10, title:'Little Keepsake', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M13 25 36 13l23 12v27H13Z" fill="#f5d9e4" stroke="#c98da8" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 24h52v8H10z" fill="#e8b9cb" stroke="#c98da8" stroke-width="2"/><path d="M29 23c0-8 14-8 14 0-1 5-7 8-7 8s-6-3-7-8Z" fill="#d77e9e"/><path d="M36 32v20" stroke="#c98da8" stroke-width="2"/><path d="m23 18 5-5m16 5 5-5" stroke="#fff8f4" stroke-width="2" stroke-linecap="round"/></svg>'},
    {goal:100, title:'Sweet Letter', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><rect x="10" y="17" width="52" height="36" rx="7" fill="#fff0e8" stroke="#c98da8" stroke-width="2.2"/><path d="m12 22 24 19 24-19" fill="none" stroke="#d89bb2" stroke-width="2.5" stroke-linecap="round"/><path d="M28 13c0-6 9-7 9 0 0-7 10-6 9 0-1 5-9 10-9 10s-8-5-9-10Z" fill="#d77e9e"/><path d="M19 47h15m-15-5h9" stroke="#d8b4c2" stroke-width="2" stroke-linecap="round"/></svg>'},
    {goal:250, title:'Blushing Bouquet', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M22 30 36 55 50 30" fill="#d9e7ce" stroke="#91aa82" stroke-width="2"/><path d="M36 53V29M36 43 24 34M36 40l12-10" stroke="#91aa82" stroke-width="2.5" stroke-linecap="round"/><g fill="#f4c5d5" stroke="#c98da8" stroke-width="1.5"><circle cx="23" cy="20" r="7"/><circle cx="36" cy="13" r="7"/><circle cx="49" cy="20" r="7"/></g><g fill="#e6a1b9"><circle cx="23" cy="20" r="2.5"/><circle cx="36" cy="13" r="2.5"/><circle cx="49" cy="20" r="2.5"/></g><path d="m22 45 14 10 14-10" fill="none" stroke="#c98da8" stroke-width="3" stroke-linecap="round"/></svg>'},
    {goal:500, title:'Golden Treasure', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="m36 8 7 8 12-1-2 12 8 9-10 7-3 12-12-4-12 4-3-12-10-7 8-9-2-12 12 1Z" fill="#f7e8b8" stroke="#c7a45f" stroke-width="2"/><path d="m36 19 12 11-12 17-12-17Z" fill="#e8a4ba" stroke="#bd7895" stroke-width="2"/><path d="m24 30 12 4 12-4M36 34v13" fill="none" stroke="#fff4e7" stroke-width="2"/><circle cx="36" cy="28" r="3" fill="#fff5d9"/></svg>'},
    {goal:750, title:'Love Guardian', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="m13 27 6-14 12 8 5-12 5 12 12-8 6 14-9 24H22Z" fill="#e9dff4" stroke="#a58bb8" stroke-width="2" stroke-linejoin="round"/><path d="M25 31c0-7 10-8 11 0 2-8 12-7 12 0-1 7-12 15-12 15S26 38 25 31Z" fill="#d77e9e" stroke="#bd7895" stroke-width="1.4"/><circle cx="19" cy="17" r="2" fill="#d7b56e"/><circle cx="53" cy="17" r="2" fill="#d7b56e"/><path d="M18 48q-5 5-1 9m37-9q5 5 1 9" fill="none" stroke="#a58bb8" stroke-width="2" stroke-linecap="round"/></svg>'},
    {goal:1000, title:'Everlasting Love', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><circle cx="36" cy="32" r="25" fill="#fff0e7" stroke="#d5a2b5" stroke-width="2"/><circle cx="36" cy="32" r="20" fill="none" stroke="#e6c1ce" stroke-width="1.5" stroke-dasharray="2 3"/><path d="M24 29c0-9 12-10 12 0 1-10 13-9 13 0-1 9-13 18-13 18S25 38 24 29Z" fill="#d77e9e" stroke="#bd7895" stroke-width="1.5"/><path d="m16 12 3 4 5 1-5 2-3 5-2-5-5-2 5-1Zm40-2 2 4 4 2-4 1-2 4-2-4-4-1 4-2Z" fill="#d6b66f"/><path d="M15 39q-5-5-7 0m49 0q5-5 7 0" fill="none" stroke="#91aa82" stroke-width="2" stroke-linecap="round"/></svg>'},
    {goal:1500, title:'Everlasting Rose', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M36 42v15" stroke="#789a79" stroke-width="3" stroke-linecap="round"/><path d="M35 52q-12-12-19-5 7 11 19 7m2-5q11-12 19-5-6 11-19 7" fill="#b8d2a9" stroke="#789a79" stroke-width="1.5"/><g fill="#df789c" stroke="#a94e73" stroke-width="1.8"><path d="M36 8c-8-7-18 1-12 10-10 4-6 17 5 16 0 10 14 12 16 1 10 2 15-10 6-16 6-10-5-18-15-11z"/><path d="M25 22q2-11 12-7 10-3 12 7-2 12-13 13-11-2-11-13z" fill="#f4b5ca"/></g><path d="M29 22q4-7 11-2-2 7-7 8" fill="none" stroke="#fff1f5" stroke-width="2" stroke-linecap="round"/><circle cx="35" cy="24" r="2" fill="#f6d68b"/></svg>'},
    {goal:2000, title:'Heart of the Garden', icon:'<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M36 42v14" stroke="#789a79" stroke-width="3" stroke-linecap="round"/><path d="M35 51q-11-10-17-4 6 9 17 6m2-2q10-10 17-4-5 9-17 6" fill="#b8d2a9" stroke="#789a79" stroke-width="1.4"/><g fill="#d8c5ed" stroke="#9277ae" stroke-width="1.8"><path d="M36 6c-6-5-13 1-10 8-9 1-10 12-2 16-1 9 11 12 13 3 3 9 15 6 13-3 8-5 6-15-3-16-2-9-9-12-11-8z"/></g><path d="m18 15 4-9 10 7 4-11 5 11 10-7 3 10" fill="#edca79" stroke="#a98548" stroke-width="1.7" stroke-linejoin="round"/><circle cx="36" cy="25" r="8" fill="#fff0c8" stroke="#c49a55" stroke-width="1.8"/><path d="M31 26c0-5 5-5 5 0 1-5 6-5 6 0-1 4-6 7-6 7s-5-3-5-7z" fill="#d8799d"/></svg>'}
  ];
    const milestoneBadges = (items,total,unit) => items.map((item,index) => {
      const unlocked = total >= item.goal;
      const art = unit === 'days' ? STREAK_MILESTONE_ILLUSTRATIONS[index] : item.icon;
      const status = unlocked ? 'Unlocked' : 'Locked';
      const label = item.title+' · '+item.goal.toLocaleString()+' '+unit+' · '+status;
      return '<span class="friend-profile-milestone-badge '+(unlocked ? 'is-unlocked' : 'is-locked')+'" title="'+esc(label)+'" aria-label="'+esc(label)+'">'+(typeof art === 'string' && art.trim().startsWith('<svg') ? '<span class="friend-profile-milestone-svg">'+art+'</span>' : '<span class="friend-profile-milestone-emoji">'+art+'</span>')+'</span>';
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


function renderFriendsPage(c) {
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
