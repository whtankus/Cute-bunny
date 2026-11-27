/* photos feature functions; classic-script compatibility with current app state. */
'use strict';

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

async function openPhotoLightbox(id, fallbackItem = null) {
  const item = feed.find(memory => String(memory.id) === String(id)) || fallbackItem;
  if (!item || item.kind !== 'photo') return;
  const gate = $('#photoLightbox'), image = $('#photoLightboxImage'), deleteButton = $('#photoLightboxDelete'), saveButton = $('#photoLightboxSave');
  const thumb = [...document.querySelectorAll('.feed-item[data-memory]')].find(node => node.dataset.memory === String(id))?.querySelector('.feed-photo')
    || [...document.querySelectorAll('[data-chat-open-photo]')].find(node => node.dataset.chatOpenPhoto === String(id))?.querySelector('img');
  const isOwnPhoto = String(item.author?.id || item.owner_id || '') === String(me?.id || '');
  const canDelete = isOwnPhoto && !item.isPending;
  gate.dataset.memoryId = String(id);
  // Own photos never expose Save. While an upload is pending, show no action.
  deleteButton.classList.toggle('hidden', !canDelete);
  deleteButton.setAttribute('aria-hidden', String(!canDelete));
  saveButton.classList.toggle('hidden', isOwnPhoto);
  saveButton.setAttribute('aria-hidden', String(isOwnPhoto));
  // Reuse the already-rendered thumbnail immediately whenever possible.
  const visibleSource = thumb?.currentSrc || thumb?.getAttribute('src') || item.previewUrl || '';
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
  const hasLocalPreview = node?.dataset.localPreview === 'true';
  if (!node || (!hasLocalPreview && node.getAttribute('src')) || node.dataset.mediaLoading === 'true') return;
  try {
    const memory = feed.find(item => String(item.id) === String(node.dataset.media)) || (node.dataset.storagePath ? {
      id: node.dataset.media, storagePath: node.dataset.storagePath,
      contentType: node.dataset.contentType || ''
    } : null);
    if (!memory?.storagePath || memory.isPending) return;
    node.dataset.mediaLoading = 'true';
    if (node.loading !== 'eager') node.loading = 'lazy';
    node.decoding = 'async';
    const url = await resolveMediaSource(memory);
    const stillHasLocalPreview = node.dataset.localPreview === 'true';
    if (node.isConnected && (stillHasLocalPreview || !node.getAttribute('src'))) {
      const previousPreviewUrl = stillHasLocalPreview ? node.getAttribute('src') || '' : '';
      node.src = url;
      delete node.dataset.localPreview;

      // Swap the short-lived picker preview for the durable media-cache URL.
      // Retire the original object URL only after the replacement has decoded.
      if (previousPreviewUrl.startsWith('blob:') && previousPreviewUrl !== url) {
        const releasePreview = () => {
          if (!node.isConnected || node.getAttribute('src') !== url || !node.complete || node.naturalWidth < 1) return;
          for (const item of feed) {
            if (String(item.id) === String(memory.id) && item.previewUrl === previousPreviewUrl) {
              delete item.previewUrl;
            }
            if (Array.isArray(item.photos)) {
              item.photos.forEach(photo => {
                if (String(photo.id) === String(memory.id) && photo.previewUrl === previousPreviewUrl) {
                  delete photo.previewUrl;
                }
              });
            }
          }
          URL.revokeObjectURL(previousPreviewUrl);
        };
        const restorePreview = error => {
          if (!node.isConnected || node.getAttribute('src') !== url) return;
          console.warn('Stored photo did not decode; keeping local preview:', error?.message || error);
          node.src = previousPreviewUrl;
          node.dataset.localPreview = 'true';
        };
        if (typeof node.decode === 'function') {
          node.decode().then(releasePreview).catch(restorePreview);
        } else {
          node.addEventListener('load', releasePreview, { once: true });
          node.addEventListener('error', restorePreview, { once: true });
        }
      }
    }
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
    const prioritizedNodes = page === 'gallery'
      ? nodes.slice(0, 12)
      : page === 'notes'
        ? nodes.filter(node => node.dataset.localPreview === 'true').slice(-6)
        : [];
    const prioritizedSet = new Set(prioritizedNodes);
    prioritizedNodes.forEach(node => void hydrateOneMedia(node));
    nodes.filter(node => !prioritizedSet.has(node)).forEach(node => mediaObserver.observe(node));
    if (page === 'music') warmSongSources(feed.filter(item => item.kind === 'song').slice(0, 8));
  } else nodes.forEach(node => void hydrateOneMedia(node));
}



/* Measure the intrinsic card content and map it to CSS grid row spans.
   This keeps chronological DOM order while allowing either column to grow
   independently, without CSS multi-column's vertical reordering. */
let photoGardenLayoutObserver = null;
let photoGardenLayoutFrame = 0;

function layoutPhotoGardenMasonry() {
  const grid = document.querySelector('#content .photo-garden-grid');
  if (!grid) return;
  const styles = getComputedStyle(grid);
  const rowSize = parseFloat(styles.gridAutoRows) || 4;
  const rowGap = parseFloat(styles.rowGap) || 8;
  const stride = rowSize + rowGap;
  const columns = [0, 0];
  const items = [...grid.querySelectorAll(':scope > .feed-item')];

  // Assign each next chronological photo to whichever column currently ends
  // higher. Explicit grid coordinates prevent CSS Grid's row cursor from
  // creating large holes beneath tall photos.
  items.forEach(item => {
    const tile = item.querySelector(':scope > .tile');
    const byline = item.querySelector(':scope > .feed-by');
    if (!tile) return;
    const contentHeight = tile.getBoundingClientRect().height + (byline?.getBoundingClientRect().height || 0);
    if (!contentHeight) return;
    const span = Math.max(1, Math.ceil((contentHeight + rowGap) / stride));
    const column = columns[0] <= columns[1] ? 0 : 1;
    const rowStart = columns[column] + 1;
    item.style.gridColumn = String(column + 1);
    item.style.gridRow = rowStart + ' / span ' + span;
    columns[column] += span;
  });
}

function schedulePhotoGardenMasonry() {
  if (photoGardenLayoutFrame) cancelAnimationFrame(photoGardenLayoutFrame);
  photoGardenLayoutFrame = requestAnimationFrame(() => {
    photoGardenLayoutFrame = 0;
    layoutPhotoGardenMasonry();
  });
}

function observePhotoGardenMasonry() {
  photoGardenLayoutObserver?.disconnect();
  photoGardenLayoutObserver = null;
  const grid = document.querySelector('#content .photo-garden-grid');
  if (!grid) return;
  layoutPhotoGardenMasonry();
  if ('ResizeObserver' in window) {
    photoGardenLayoutObserver = new ResizeObserver(schedulePhotoGardenMasonry);
    grid.querySelectorAll(':scope > .feed-item > .tile, :scope > .feed-item > .feed-by')
      .forEach(node => photoGardenLayoutObserver.observe(node));
  }
  grid.querySelectorAll('.feed-photo').forEach(image => {
    image.addEventListener('load', schedulePhotoGardenMasonry, { passive: true });
    image.addEventListener('error', schedulePhotoGardenMasonry, { passive: true });
  });
  window.addEventListener('resize', schedulePhotoGardenMasonry, { passive: true });
}

function renderPhotosPage(c, pics) {
    c.innerHTML = `
      <div class="heading"><h2>Photo garden 🌷</h2><p>Little snapshots, shared with your friend.</p></div>
      <label class="primary upload-label">＋ Add photo<input data-upload="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>
      <section class="photo-garden-grid" aria-label="Shared photo garden, latest photos first">${pics.map(memoryCard).join('') || '<div class="empty">Your garden is waiting for its first photo ♡</div>'}</section>
      ${historySentinelMarkup('bottom')}
    `;
    observePhotoGardenMasonry();
}
