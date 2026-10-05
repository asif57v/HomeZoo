/**
 * Utility to compress and resize images client-side before uploading.
 * Reduces 5MB-10MB photos to ~150KB-300KB, preventing HTTP 413 (Payload Too Large) errors on Nginx / hosting.
 */
export const compressImage = (file, maxWidth = 1600, maxHeight = 1600, quality = 0.82) => {
  return new Promise((resolve) => {
    // If not an image or is SVG, return original
    if (!file || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      return resolve(file);
    }

    // If file is already smaller than 300KB, no need to compress heavily
    if (file.size < 300 * 1024) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              return resolve(file);
            }
            const cleanName = (file.name || 'image').replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default compressImage;
