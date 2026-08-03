// frontend/src/utils/convertImage.ts
// Universal image converter: converts ANY format (HEIC/HEIF/PNG/JPG) to WebP
// Called at UPLOAD TIME so R2 always stores WebP — instant browser loading!

/**
 * Converts any image File to a WebP Blob.
 * - HEIC/HEIF: uses heic2any library
 * - PNG/JPG/GIF: uses Canvas API (built into browser)
 * - WebP: returns as-is
 */
export async function convertToWebP(file: File): Promise<{ blob: Blob; filename: string }> {
  const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
  const type = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // Already WebP — return as-is
  if (type === 'image/webp') {
    return { blob: file, filename: file.name };
  }

  // HEIC / HEIF — must use heic2any (Canvas can't decode HEIC)
  if (ext === 'heic' || ext === 'heif' || type === 'image/heic' || type === 'image/heif') {
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({
      blob: file,
      toType: 'image/webp',
      quality: 0.92,
    });
    const blob = Array.isArray(result) ? result[0] : result;
    return { blob, filename: name };
  }

  // PNG / JPG / GIF / BMP — convert via Canvas
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error('Canvas toBlob failed'));
          resolve({ blob, filename: name });
        },
        'image/webp',
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: return original if canvas fails
      resolve({ blob: file, filename: file.name });
    };
    img.src = url;
  });
}
