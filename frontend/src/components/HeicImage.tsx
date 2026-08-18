// frontend/src/components/HeicImage.tsx
// Smart image renderer for R2 PNG product images:
// - PNG/JPG → weserv.nl (PNG→WebP convert + resize) → 60-70% smaller → FAST
// - HEIC/HEIF → weserv.nl converts to WebP → Browser compatible
// - WebP already → Direct CDN (no proxy needed)
// - data:/blob: → Direct (upload preview)
import React, { useState } from 'react';

const R2_CDN = 'https://media.heelsup.in';
const WESERV = 'https://images.weserv.nl/';

// Width per size slot — product cards are max 400px wide on any device
const SIZE_W: Record<string, number> = {
  thumb: 480,  // Shop grid cards (2-3 col grid) → 480px is plenty
  full:  900,  // Product detail page main image
  hero: 1200,  // Hero/banner (not used for products)
};

interface HeicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
  size?: 'thumb' | 'full' | 'hero';
  index?: number;
  fit?: 'cover' | 'contain';
}

/**
 * Build an optimized image URL:
 * - PNG/JPG/HEIC → route through weserv.nl for WebP conversion + resize
 * - WebP already → direct CDN (already optimized)
 * - data:/blob:/static → return as-is
 */
function getDisplaySrc(src: string | undefined, size: 'thumb' | 'full' | 'hero' = 'thumb'): string | null {
  if (!src || !src.trim()) return null;

  // Upload previews / blobs — show directly, no proxy
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  // Static site assets (logo, icons starting with /)
  if (src.startsWith('/') && !src.startsWith('/api/')) return src;

  // Build full URL if relative path (R2 key)
  let fullUrl = src.startsWith('http') ? src : `${R2_CDN}/${src}`;

  const lower = fullUrl.toLowerCase();
  const w = SIZE_W[size] ?? 480;

  // Already WebP → direct CDN, no proxy needed (already small)
  if (lower.endsWith('.webp') || lower.includes('.webp?')) {
    return fullUrl;
  }

  // PNG / JPG / JPEG / HEIC → convert to WebP via weserv.nl
  // Parameters:
  //   output=webp  → convert to WebP (60-70% smaller than PNG)
  //   q=82         → 82% quality (sharp + small)
  //   w={w}        → resize to card width (no point loading 2000px for a 400px card)
  //   fit=inside   → preserve aspect ratio (don't crop)
  //   n=-1         → cache forever on weserv.nl CDN
  //   we=1         → without enlargement (don't upscale small images)
  return `${WESERV}?url=${encodeURIComponent(fullUrl)}&output=webp&q=82&w=${w}&fit=inside&n=-1&we=1`;
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
  onError: customOnError,
  ...props
}: HeicImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const displaySrc = getDisplaySrc(src, size);
  if (!displaySrc) {
    // No valid source — render a proper placeholder instead of null
    return (
      <div
        className={`${className} h-48 w-full bg-neutral-200 rounded-xl flex items-center justify-center text-neutral-500 animate-pulse`}
        style={{ backgroundColor: '#f5f2eb' }}
      >
        <span className="text-sm">No Image</span>
      </div>
    );
  }

  // First 4 products are above-the-fold → load eagerly with high priority
  const aboveFold = index !== undefined ? index < 4 : (size === 'full' || size === 'hero');
  const resolvedLoading  = loading      ?? (aboveFold ? 'eager'  : 'lazy');
  const resolvedPriority = fetchpriority ?? (aboveFold ? 'high'  : 'auto');

  // Determine object-fit
  const hasFitInClass = className.includes('object-cover') || className.includes('object-contain');
  let fitClass = '';
  if (!hasFitInClass) {
    if (fit === 'cover')        fitClass = 'object-cover';
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
      onError={(e) => {
        setLoaded(true);
        setErrored(true);
        // Run custom error handler if provided, otherwise fallback logic
        if (customOnError) {
          customOnError(e);
        } else {
          // Fallback to original file path on error
          const imgEl = document.querySelector(`img[src="${displaySrc}"]`) as HTMLImageElement | null;
          if (imgEl && src) {
            const fallback = src.startsWith('http') ? src : `${R2_CDN}/${src}`;
            if (imgEl.src !== fallback) imgEl.src = fallback;
          }
        }
      }}
      {...props}
    />
  );
}
