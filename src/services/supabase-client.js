/* Supabase client construction belongs to the service layer. */
(() => {
  'use strict';
  function createSupabaseClient(supabaseSdk, config = {}) {
    const url = String(config.supabaseUrl || '').trim();
    const key = String(config.supabaseAnonKey || '').trim();
    if (!supabaseSdk || typeof supabaseSdk.createClient !== 'function') return null;
    if (!url || url.startsWith('PASTE_') || !key || key.startsWith('PASTE_')) return null;
    return supabaseSdk.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
  window.CuteBunnyServices = Object.freeze({ createSupabaseClient });
})();
