window.CUTE_BUNNY_CONFIG = { supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'test-anon-key' };
(() => {
  const now = new Date().toISOString();
  const me = {
    id: 'user-ankush-test', username: 'ankush_test', display_name: 'Ankush Test',
    bio: 'A little test garden', theme: 'rose', mascot: '🐰',
    profile_wallpaper: 'normal', gender: null, created_at: now,
    login_streak: 3, last_login_date: now.slice(0, 10), streak_timezone: 'Asia/Kolkata'
  };
  const friend = {
    id: 'friend-test', username: 'friend_test', display_name: 'Bunny Friend',
    bio: 'Hello from the test garden', theme: 'lavender', mascot: '🐱',
    profile_wallpaper: 'blossom', created_at: now, login_streak: 2
  };
  const state = {
    user: me,
    friend,
    nextMemoryId: 103,
    uploads: [],
    calls: [],
    tables: {
      profiles: [me, friend],
      follows: [{ follower_id: me.id, followed_id: friend.id, created_at: now }],
      memories: [
        { id: 101, owner_id: friend.id, kind: 'note', text: 'A little hello from your friend ♡', created_at: now, file_name: '', content_type: '', storage_path: '' },
        { id: 102, owner_id: me.id, kind: 'note', text: 'A sunny little day', created_at: now, file_name: '', content_type: '', storage_path: '' },
        { id: 100, owner_id: friend.id, kind: 'photo', text: 'Garden photo', created_at: now, file_name: 'garden.png', content_type: 'image/png', storage_path: friend.id + '/photo/garden.png' }
      ],
      memory_likes: [],
      notifications: [{
        id: 'notification-1', recipient_id: me.id, actor_id: friend.id, kind: 'photo',
        memory_id: 100, message: 'Bunny Friend liked your photo ♡', created_at: now, read_at: null
      }],
      note_read_cursors: [],
      profile_private_settings: [{ user_id: me.id, notification_preferences: { memories: true, buddy: true } }]
    }
  };
  window.__cuteBunnyTestState = state;
  window.IntersectionObserver = class { constructor(callback) { this.callback = callback; } observe(target) { this.callback([{ target, isIntersecting: true, intersectionRatio: 1 }]); } unobserve() {} disconnect() {} };

  class Query {
    constructor(table) {
      this.table = table; this.action = 'select'; this.payload = null; this.filters = [];
      this.orders = []; this.maxRows = null; this.slice = null; this.cardinality = 'many';
      this.returning = false; this.conflict = null;
    }
    select() { this.returning = true; return this; }
    insert(value) { this.action = 'insert'; this.payload = Array.isArray(value) ? value : [value]; return this; }
    update(value) { this.action = 'update'; this.payload = value; return this; }
    delete() { this.action = 'delete'; return this; }
    upsert(value, options = {}) { this.action = 'upsert'; this.payload = Array.isArray(value) ? value : [value]; this.conflict = options.onConflict; return this; }
    eq(key, value) { this.filters.push(row => row[key] === value); return this; }
    neq(key, value) { this.filters.push(row => row[key] !== value); return this; }
    in(key, values) { this.filters.push(row => values.includes(row[key])); return this; }
    is(key, value) { this.filters.push(row => row[key] === value); return this; }
    ilike(key, value) { const term = String(value).replace(/%/g, '').toLowerCase(); this.filters.push(row => String(row[key] || '').toLowerCase().includes(term)); return this; }
    order(key, options = {}) { this.orders.push({ key, ascending: options.ascending !== false }); return this; }
    limit(value) { this.maxRows = value; return this; }
    range(from, to) { this.slice = [from, to]; return this; }
    single() { this.cardinality = 'one'; return this; }
    maybeSingle() { this.cardinality = 'maybe'; return this; }
    then(resolve, reject) { return this.execute().then(resolve, reject); }
    async execute() {
      const rows = state.tables[this.table] || (state.tables[this.table] = []);
      state.calls.push({ table: this.table, action: this.action, payload: this.payload });
      let matched = rows.filter(row => this.filters.every(filter => filter(row)));
      if (this.action === 'insert' || this.action === 'upsert') {
        const inserted = this.payload.map(source => {
          const row = { ...source };
          if (this.table === 'memories') {
            row.id = state.nextMemoryId++;
            row.created_at = row.created_at || new Date().toISOString();
          }
          if (this.table === 'notifications') row.id = row.id || 'notification-' + (rows.length + 1);
          if (this.table === 'note_read_cursors') row.last_read_at = row.last_read_at || new Date().toISOString();
          if (this.action === 'upsert') {
            const key = this.conflict || (this.table === 'profile_private_settings' ? 'user_id' : 'id');
            const existing = rows.find(item => item[key] === row[key]);
            if (existing) { Object.assign(existing, row); return existing; }
          }
          rows.push(row);
          return row;
        });
        matched = inserted;
      } else if (this.action === 'update') {
        matched.forEach(row => Object.assign(row, this.payload));
      } else if (this.action === 'delete') {
        const removed = new Set(matched);
        state.tables[this.table] = rows.filter(row => !removed.has(row));
        matched = [];
      }
      let result = matched.map(row => this.project(row));
      for (const order of this.orders.slice().reverse()) {
        result.sort((a, b) => {
          const av = a[order.key], bv = b[order.key];
          const cmp = av === bv ? 0 : av == null ? -1 : bv == null ? 1 : av < bv ? -1 : 1;
          return order.ascending ? cmp : -cmp;
        });
      }
      if (this.slice) result = result.slice(this.slice[0], this.slice[1] + 1);
      if (this.maxRows !== null) result = result.slice(0, this.maxRows);
      if (!this.returning && this.action !== 'select') return { data: null, error: null };
      if (this.cardinality === 'one') return { data: result[0] || null, error: result.length === 1 ? null : { message: 'Expected one row' } };
      if (this.cardinality === 'maybe') return { data: result[0] || null, error: null };
      return { data: result, error: null };
    }
    project(row) {
      const value = { ...row };
      if (this.table === 'memories') {
        value.author = state.tables.profiles.find(profile => profile.id === row.owner_id) || null;
        value.memory_likes = state.tables.memory_likes.filter(like => like.memory_id === row.id).map(() => ({ count: 1 }));
      }
      if (this.table === 'notifications') value.actor = state.tables.profiles.find(profile => profile.id === row.actor_id) || null;
      if (this.table === 'follows') value.followed = state.tables.profiles.find(profile => profile.id === row.followed_id) || null;
      return value;
    }
  }

  const session = { access_token: 'browser-test-access-token', refresh_token: 'browser-test-refresh-token', user: { id: me.id, email: 'test@example.invalid' } };
  window.supabase = {
    createClient() {
      return {
        auth: {
          async getSession() { return { data: { session: localStorage.getItem('cuteBunnyTestAuth') === 'true' ? session : null }, error: null }; },
          async signOut() { return { error: null }; },
          onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
          async setSession() { return { data: { session }, error: null }; }
        },
        from(table) { return new Query(table); },
        async rpc(name, args = {}) {
          state.calls.push({ rpc: name, args });
          if (name === 'mark_notes_seen') {
            const row = state.tables.note_read_cursors.find(item => item.reader_id === me.id && item.owner_id === args.p_owner_id);
            if (row) { row.last_read_message_id = Math.max(row.last_read_message_id, args.p_last_read_message_id); row.last_read_at = new Date().toISOString(); }
            else state.tables.note_read_cursors.push({ reader_id: me.id, owner_id: args.p_owner_id, last_read_message_id: args.p_last_read_message_id, last_read_at: new Date().toISOString() });
          }
          return { data: name === 'send_buddy_ping' ? true : true, error: null };
        },
        storage: {
          from(bucket) {
            return {
              async upload(path, file, options) { state.uploads.push({ bucket, path, name: file.name, type: file.type, size: file.size, options }); return { data: { path }, error: null }; },
              async createSignedUrl(path) { return { data: { signedUrl: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=' }, error: null }; },
              async remove(paths) { state.calls.push({ storageDelete: paths }); return { data: [], error: null }; }
            };
          }
        },
        channel() {
          const channel = { on() { return channel; }, subscribe() { return channel; }, track() { return Promise.resolve(); }, send() { return Promise.resolve(); }, presenceState() { return {}; } };
          return channel;
        },
        async removeChannel() { return 'ok'; }
      };
    }
  };
})();