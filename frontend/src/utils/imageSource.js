import { useEffect, useState } from 'react';

/**
 * Ask the user whether to use the camera or the gallery.
 * Resolves with 'camera' | 'gallery' | null (dismissed).
 */
export const pickImageSource = () =>
  new Promise((resolve) => {
    // Never stack two sheets (a double tap would otherwise open two).
    document.querySelectorAll('[data-image-source-sheet]').forEach((el) => el.remove());
    const overlay = document.createElement('div');
    overlay.setAttribute('data-image-source-sheet', 'true');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;';

    const sheet = document.createElement('div');
    sheet.style.cssText =
      'width:100%;max-width:480px;background:#fff;border-radius:20px 20px 0 0;padding:16px;display:flex;flex-direction:column;gap:10px;font-family:inherit;';

    const done = (value) => {
      overlay.remove();
      resolve(value);
    };

    const makeBtn = (label, value, primary) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = `padding:14px;border-radius:12px;font-weight:700;font-size:16px;border:${
        primary ? 'none' : '1px solid #e5e7eb'
      };background:${primary ? '#059669' : '#fff'};color:${primary ? '#fff' : '#374151'};`;
      b.onclick = () => done(value);
      return b;
    };

    sheet.append(
      makeBtn('Take Photo (Camera)', 'camera', true),
      makeBtn('Choose from Gallery', 'gallery', false),
      makeBtn('Cancel', null, false)
    );
    overlay.onclick = (e) => {
      if (e.target === overlay) done(null);
    };
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  });

/**
 * Ask the Flutter app to open its native gallery (multi-select when `multiple`).
 * Resolves with [{base64, mimeType, fileName}], or null when the app has no
 * `pickImages` handler / the user cancelled, so callers can fall back to a web input.
 */
export const pickFlutterImages = async (multiple = false) => {
  const bridge = typeof window !== 'undefined' ? window.flutter_inappwebview : null;
  if (!bridge?.callHandler) return null;
  try {
    const result = await bridge.callHandler('pickImages', { multiple });
    if (!result?.success || !Array.isArray(result.images) || !result.images.length) return null;
    const images = result.images.filter((img) => img?.base64);
    return images.length ? (multiple ? images : images.slice(0, 1)) : null;
  } catch {
    return null;
  }
};

/** Open the device gallery/file picker. Resolves with an array of Files (empty if cancelled). */
export const pickGalleryFiles = (multiple = false) =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.style.display = 'none';
    // Disable every other file input while the picker is open, so a WebView
    // file chooser can only hand the result to this one (not e.g. the cover input).
    const others = Array.from(document.querySelectorAll('input[type="file"]')).filter((el) => !el.disabled);
    others.forEach((el) => { el.disabled = true; });
    const restore = () => others.forEach((el) => { el.disabled = false; });
    // Safety net: some WebViews never fire change/cancel when the picker is dismissed.
    const safety = setTimeout(restore, 60000);
    const finish = (files) => {
      clearTimeout(safety);
      restore();
      input.remove();
      resolve(files);
    };
    input.onchange = () => finish(Array.from(input.files || []));
    input.oncancel = () => finish([]);
    // Prepend so this is the first file input in the document: some WebView
    // file choosers deliver the picked file to the first input they find,
    // which would otherwise be the cover image input.
    document.body.prepend(input);
    input.click();
  });

/** True while the on-screen keyboard is open (viewport shrinks and a field is focused). */
export const useKeyboardOpen = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let baseHeight = window.innerHeight;
    const isField = () => {
      const el = document.activeElement;
      return !!el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    };
    const update = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      if (!isField()) baseHeight = Math.max(baseHeight, window.innerHeight);
      setOpen(isField() && baseHeight - h > 150);
    };
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    const onFocusOut = () => setTimeout(update, 100);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
    };
  }, []);

  return open;
};
