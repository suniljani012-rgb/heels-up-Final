// frontend/src/components/HeicImage.tsx
// Smart image renderer:
// - PNG/JPG/WebP → Direct CDN → INSTANT
// - HEIC/HEIF    → weserv.nl converts to WebP → Shows correctly in browser
// New uploads are auto-converted to WebP at upload time (imageUpload.ts)
// so this HEIC proxy path is only for OLD existing images.
import React, { useState } from 'react';

const R2_CDN = 'https://media.heelsup.in';

interface HeicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
  size?: 'thumb' | 'full' | 'hero';
  index?: number;
  fit?: 'cover' | 'contain';
}

function getDisplaySrc(src: string | undefined): string | null {
  if (!src || !src.trim()) return null;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  // Static path (logo, icons)
  if (src.startsWith('/') && !src.startsWith('/api/')) return src;

  let fullUrl = src;

  // Relative key → build full R2 CDN URL
  if (!src.startsWith('http')) {
    fullUrl = `${R2_CDN}/${src}`;
  }

  // HEIC/HEIF: old images stored as .heic on R2
  // Convert via weserv.nl → WebP so browser can display
  const lower = fullUrl.toLowerCase();
  if (lower.includes('.heic') || lower.includes('.heif')) {
    // weserv.nl caches converted images on their CDN
    // First load: ~500ms conversion, subsequent loads: <20ms (cached)
    return `https://images.weserv.nl/?url=${encodeURIComponent(fullUrl)}&output=webp&q=88&n=-1`;
  }

  return fullUrl;
}

export default function HeicImage({
  src,
  className = '',
  loading,
  fetchpriority,
  alt = '',
  style,
  size = 'thumb',
  index,
  fit,
  onLoad,
  ...props
}: HeicImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const displaySrc = getDisplaySrc(src);
  if (!displaySrc) return null;

  const aboveFold = index !== undefined ? index < 4 : (size === 'full' || size === 'hero');
  const resolvedLoading = loading ?? (aboveFold ? 'eager' : 'lazy');
  const resolvedPriority = fetchpriority ?? (aboveFold ? 'high' : 'auto');

  // Determine object-fit
  const hasFitInClass = className.includes('object-cover') || className.includes('object-contain');
  let fitClass = '';
  if (!hasFitInClass) {
    if (fit === 'cover') fitClass = 'object-cover';
    else if (fit === 'contain') fitClass = 'object-contain';
    else fitClass = size === 'hero' ? 'object-cover' : 'object-contain';
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={`${className} ${fitClass} transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      style={{
        backgroundColor: '#f5f2eb',
        ...style,
      }}
      loading={resolvedLoading}
      decoding={aboveFold ? 'sync' : 'async'}
      fetchPriority={resolvedPriority}
      onLoad={(e) => {
        setLoaded(true);
        if (onLoad) onLoad(e);
      }}
      onError={() => {
        // Show placeholder shade on error
        setLoaded(true);
        setErrored(true);
      }}
      {...props}
    />
  );
}
