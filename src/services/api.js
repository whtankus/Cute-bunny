/* Supabase-backed application data access. UI code calls this small API facade. */
(() => {
  'use strict';
  function createApi({ client, getCurrentUser, fetchFriendHeartCounts, themes }) {
    const sb = client;
    const APP_THEMES = themes;
    return async function api(path, options = {}) {
  const me = getCurrentUser();
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

    const noteIds = (rows || []).filter(memory => memory.kind === 'note').map(memory => memory.id);
    const attachedPhotosByNote = new Map();
    if (noteIds.length) {
      const { data: links, error: linksError } = await sb.from('note_message_photos')
        .select('note_id,photo_id,photo:memories!note_message_photos_photo_id_fkey(id,owner_id,kind,file_name,content_type,storage_path,created_at)')
        .in('note_id', noteIds);
      // Keep old Notes conversations readable until the new migration is applied.
      if (linksError && !/note_message_photos|schema cache/i.test(linksError.message || '')) fail(linksError);
      for (const link of links || []) {
        const photo = Array.isArray(link.photo) ? link.photo[0] : link.photo;
        if (!photo) continue;
        const items = attachedPhotosByNote.get(String(link.note_id)) || [];
        items.push({
          id: photo.id, owner_id: photo.owner_id, storagePath: photo.storage_path,
          contentType: photo.content_type, fileName: photo.file_name, createdAt: photo.created_at
        });
        attachedPhotosByNote.set(String(link.note_id), items);
      }
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
        photos: attachedPhotosByNote.get(String(m.id)) || [],
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
    const { data: m, error } = await sb.from('memories').select('id,owner_id,kind,storage_path').eq('id', id).single();
    fail(error);

    // Deleting a Notes message also deletes its attached Photo Garden memories.
    if (m.kind === 'note') {
      const { data: links, error: linksError } = await sb.from('note_message_photos')
        .select('photo_id').eq('note_id', id);
      const missingLinksTable = /note_message_photos.*(does not exist|not found|schema cache)|schema cache.*note_message_photos/i.test(linksError?.message || '');
      if (linksError && !missingLinksTable) fail(linksError);
      const photoIds = [...new Set((links || []).map(link => String(link.photo_id)).filter(Boolean))];
      let photos = [];
      if (photoIds.length) {
        const { data, error: photosError } = await sb.from('memories')
          .select('id,storage_path').in('id', photoIds)
          .eq('owner_id', session.user.id).eq('kind', 'photo');
        fail(photosError);
        photos = data || [];
      }
      if (!missingLinksTable) {
        const { error: linksDeleteError } = await sb.from('note_message_photos').delete().eq('note_id', id);
        fail(linksDeleteError);
      }
      const { error: noteDeleteError } = await sb.from('memories').delete()
        .eq('id', id).eq('owner_id', session.user.id).eq('kind', 'note');
      fail(noteDeleteError);
      const paths = photos.map(photo => photo.storage_path).filter(Boolean);
      if (paths.length) await sb.storage.from('memories').remove(paths);
      const deletedPhotoIds = photos.map(photo => String(photo.id));
      if (deletedPhotoIds.length) {
        const { error: photoDeleteError } = await sb.from('memories').delete()
          .in('id', deletedPhotoIds).eq('owner_id', session.user.id).eq('kind', 'photo');
        fail(photoDeleteError);
      }
      return { deletedNoteIds: [String(id)], deletedPhotoIds };
    }

    // If a Photo Garden photo is the only content in a Notes message, remove
    // that empty message too so its author and timestamp do not linger in chat.
    const emptyNoteIds = [];
    if (m.kind === 'photo') {
      const { data: links, error: linksError } = await sb.from('note_message_photos').select('note_id').eq('photo_id', id);
      const missingLinksTable = /note_message_photos.*(does not exist|not found|schema cache)|schema cache.*note_message_photos/i.test(linksError?.message || '');
      if (linksError && !missingLinksTable) fail(linksError);
      for (const noteId of [...new Set((links || []).map(link => String(link.note_id)))]) {
        const [{ data: note, error: noteError }, { data: remaining, error: remainingError }] = await Promise.all([
          sb.from('memories').select('id,text').eq('id', noteId).eq('owner_id', session.user.id).eq('kind', 'note').maybeSingle(),
          sb.from('note_message_photos').select('photo_id').eq('note_id', noteId).neq('photo_id', id)
        ]);
        fail(noteError);
        if (remainingError && !/note_message_photos.*(does not exist|not found|schema cache)|schema cache.*note_message_photos/i.test(remainingError.message || '')) fail(remainingError);
        if (note && !String(note.text || '').trim() && !(remaining || []).length) emptyNoteIds.push(String(note.id));
      }
    }

    if (m.storage_path) await sb.storage.from('memories').remove([m.storage_path]);
    const { error: deleteError } = await sb.from('memories').delete().eq('id', id);
    fail(deleteError);
    if (emptyNoteIds.length) {
      const { error: noteDeleteError } = await sb.from('memories').delete()
        .in('id', emptyNoteIds).eq('owner_id', session.user.id).eq('kind', 'note');
      fail(noteDeleteError);
    }
    return { deletedNoteIds: emptyNoteIds, deletedPhotoIds: m.kind === 'photo' ? [String(id)] : [] };
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
  }
  window.CuteBunnyServices = Object.freeze({ ...window.CuteBunnyServices, createApi });
})();
