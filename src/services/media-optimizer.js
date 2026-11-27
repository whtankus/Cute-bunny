/* Image upload preparation shared by Photos and Notes. */
(() => {
  'use strict';
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
  window.CuteBunnyServices = Object.freeze({ ...window.CuteBunnyServices, optimizePhotoUpload });
})();
