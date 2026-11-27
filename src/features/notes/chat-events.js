/* Notes composer keyboard and submit behaviour. Loaded after app.js. */
(() => {
  'use strict';

  document.addEventListener('click', event => {
    const picker = event.target.closest('#chatPhotoPicker');
    if (picker) {
      event.preventDefault();
      document.querySelector('#chatPhotoInput')?.click();
      return;
    }

    const remove = event.target.closest('[data-chat-photo-remove]');
    if (remove) {
      event.preventDefault();
      event.stopPropagation();

      // Resolve the selected item first, then mutate the source array so the
      // composer, preview and send-state all observe the same removal.
      const id = String(remove.getAttribute('data-chat-photo-remove') || '');
      const selectedIndex = notesSelectedPhotos.findIndex(
        item => String(item.clientPhotoId || '') === id
      );
      if (selectedIndex < 0) {
        remove.disabled = true;
        return;
      }

      remove.disabled = true;
      const [selected] = notesSelectedPhotos.splice(selectedIndex, 1);
      if (selected?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(selected.previewUrl);
      }

      window.renderNotesPhotoSelection?.();
      window.syncChatComposerState?.(document.querySelector('#chatInput'));
      return;
    }

    const openPhoto = event.target.closest('[data-chat-open-photo]');
    if (openPhoto && typeof window.openPhotoLightbox === 'function') {
      const img = openPhoto.querySelector('img');
      const message = openPhoto.closest('.chat-message');
      const ownerId = message?.dataset.owner || '';
      const photoId = openPhoto.dataset.chatOpenPhoto || '';
      void window.openPhotoLightbox(photoId, {
        id: photoId, kind: 'photo', owner_id: ownerId,
        storagePath: img?.dataset.storagePath || '',
        contentType: img?.dataset.contentType || '',
        author: { id: ownerId },
        previewUrl: img?.currentSrc || img?.getAttribute('src') || ''
      });
    }
  });

  // Prevent the browser's native Copy/Save/Open image menu on Notes photos.
  document.addEventListener('contextmenu', event => {
    const photoSurface = event.target instanceof Element
      ? event.target.closest('.chat-message-photo, .chat-photo-preview-item')
      : null;
    if (!photoSurface) return;
    event.preventDefault();
    event.stopPropagation();
  });

  document.addEventListener('change', event => {
    if (event.target.id !== 'chatPhotoInput') return;
    const input = event.target;
    const files = [...(input.files || [])];
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    let rejectedType = false;
    let rejectedSize = false;
    let previewFailed = false;
    let exceededLimit = false;

    // Validate every selected file before filling the remaining slots. An
    // invalid first file must not cause a valid later file to be silently lost.
    for (const file of files) {
      if (notesSelectedPhotos.length >= 3) {
        exceededLimit = true;
        break;
      }
      if (!allowedTypes.has(file.type)) {
        rejectedType = true;
        continue;
      }
      if (!Number.isFinite(file.size) || file.size <= 0 || file.size > 8 * 1024 * 1024) {
        rejectedSize = true;
        continue;
      }

      let previewUrl;
      try {
        previewUrl = URL.createObjectURL(file);
      } catch (error) {
        previewFailed = true;
        console.warn('Notes photo preview could not be created:', error?.message || error);
        continue;
      }
      const clientPhotoId = window.crypto?.randomUUID?.()
        || 'photo-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      notesSelectedPhotos.push({ clientPhotoId, file, previewUrl });
    }

    input.value = '';
    if (exceededLimit) window.toast?.('You can attach up to three photos ♡');
    else if (rejectedType) window.toast?.('Choose a JPG, PNG, WebP, or GIF image.');
    else if (rejectedSize) window.toast?.('Each photo must be larger than 0 bytes and under 8 MB.');
    else if (previewFailed) window.toast?.('A photo preview could not be created. Try another image.');
    window.renderNotesPhotoSelection?.();
  });

  document.addEventListener('input', event => {
    if (event.target.id === 'chatInput') window.syncChatComposerState?.(event.target);
  });

  document.addEventListener('submit', event => {
    if (event.target.id !== 'chatComposer') return;
    event.preventDefault();
    if (typeof window.sendChatMessage === 'function') void window.sendChatMessage();
  });

  document.addEventListener('keydown', event => {
    if (
      event.target.id !== 'chatInput' ||
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.isComposing ||
      event.keyCode === 229 ||
      typeof window.isTouchNotesViewport !== 'function' ||
      window.isTouchNotesViewport()
    ) return;

    // Desktop Enter sends; touch keyboards retain their native newline behaviour.
    event.preventDefault();
    if (typeof window.sendChatMessage === 'function') void window.sendChatMessage();
  });
})();
