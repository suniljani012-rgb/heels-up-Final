// frontend/src/components/HeicImage.tsx
//
// ULTRA-FAST image serving via Cloudflare CDN Image Transforms (cdn-cgi/image).
//
// How it works:
//   - Images are stored in R2 at  https://media.heelsup.in/<key>
//   - Cloudflare transforms:       https://media.heelsup.in/cdn-cgi/image/<opts>/<key>
//   - Browser picks best size via `srcset` + `sizes`
//   - Result is cached immutably at Cloudflare edge — ZERO Worker involvement
//   - Second load = instant from browser cache or Cloudflare edge (~5ms)
//
// Format auto-selection:
//   - Browsers that support AVIF get AVIF (50% smaller than WebP)
//   - Browsers that support WebP get WebP
//   - Others get JPEG
//
// Priority strategy:
//   - First 4 images (above-the-fold on mobile) → eager + high + preload
//   - Rest → lazy + low + async decode (saves bandwidth)
//
// HEIC/HEIF images are transparently converted to WebP/AVIF by Cloudflare.

import React from 'react'

const R2_CDN = 'https://media.heelsup.in';

// Quality presets
const QUALITY = {
  thumb: 72,   // product grid cards — small, fast
  full: 85,    // product detail page — high quality
  hero: 88,    // banner/hero images — max quality (LCP)
} as const;

interface HeicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'high' | 'low' | 'auto';
  /** 'thumb' (default) = grid cards | 'full' = product detail | 'hero' = banner */
  size?: 'thumb' | 'full' | 'hero';
  /** Index in product grid (0-based). First 4 get eager+high priority, rest lazy+low */
  index?: number;
}

/**
 * Extracts the R2 object key from any URL format we use:
 *   https://media.heelsup.in/products/abc.jpg           → products/abc.jpg
 *   https://media.heelsup.in/cdn-cgi/image/.../products/abc.jpg → products/abc.jpg
 *   /api/upload?key=products/abc.jpg                    → products/abc.jpg
 *   /api/upload/products/abc.jpg                        → products/abc.jpg
 *   https://x.workers.dev/api/upload?key=products/abc   → products/abc
 */
function extractKey(src: string): string | null {
  if (!src) return null;
  try {
    const parsed = new URL(src, 'https://x.invalid');

    // Already a direct CDN URL or cdn-cgi transform URL
    if (parsed.hostname === 'media.heelsup.in') {
      const p = parsed.pathname;
      // Strip cdn-cgi/image/.../ prefix if present
      const cgiMatch = p.match(/^\/cdn-cgi\/image\/[^/]+\/(.+)$/);
      if (cgiMatch) return decodeURIComponent(cgiMatch[1]);
      // Direct path
      const k = p.startsWith('/') ? p.slice(1) : p;
      if (k) return decodeURIComponent(k);
    }

    // ?key= query param (worker proxy URL)
    const key = parsed.searchParams.get('key');
    if (key) return decodeURIComponent(key);

    // Path-based worker proxy
    for (const prefix of ['/api/admin/upload/', '/api/upload/']) {
      if (parsed.pathname.startsWith(prefix)) {
        const k = parsed.pathname.slice(prefix.length);
        if (k) return decodeURIComponent(k);
      }
    }
  } catch {}
  return null;
}

/**
 * Builds a Cloudflare cdn-cgi/image transform URL.
 * This is served entirely from Cloudflare edge cache — no Worker CPU overhead.
 *
 * Example output:
 *   https://media.heelsup.in/cdn-cgi/image/width=400,quality=72,format=auto/products/abc.jpg
 */
function cfImage(key: string, width: number, quality: number): string {
  return `${R2_CDN}/cdn-cgi/image/width=${width},quality=${quality},format=auto/${key}`;
}

/**
 * Builds the final <img> src and srcset for a given image source.
 *
 * For R2 images → uses cdn-cgi/image for on-the-fly resize (cached at edge)
 * For data:/blob: → pass-through (never proxy)
 * For relative static paths → pass-through (logo, etc.)
 * For unknown external URLs → pass-through
 */
function buildSrcSet(
  src: string | undefined,
  size: 'thumb' | 'full' | 'hero'
): { src: string; srcSet?: string; sizes?: string } | null {
  if (!src || !src.trim()) return null;

  // data: or blob: — render as-is
  if (src.startsWith('data:') || src.startsWith('blob:')) return { src };

  // Static relative path (logo, icons, etc.) — never proxy
  if (src.startsWith('/') && !src.startsWith('/api/')) return { src };

  const key = extractKey(src);

  if (key) {
    const directUrl = `${R2_CDN}/${key}`;
    // Free-plan compatible image optimization: Convert heavy PNGs to lightweight WebP thumbnails
    // thumb: 450px width, quality 75 (~30 KB) | full: 900px width, quality 82 (~80 KB)
    const width = size === 'thumb' ? 450 : size === 'full' ? 900 : 1200;
    const quality = size === 'thumb' ? 75 : 85;
    const optimizedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(directUrl)}&w=${width}&q=${quality}&output=webp`;
    return { src: optimizedUrl };
  }

  // If URL is an HTTP/HTTPS image URL but not matching R2 key, optimize via proxy if it's a PNG/JPG
  if (src.startsWith('http://') || src.startsWith('https://')) {
    const width = size === 'thumb' ? 450 : size === 'full' ? 900 : 1200;
    const quality = size === 'thumb' ? 75 : 85;
    const optimizedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(src)}&w=${width}&q=${quality}&output=webp`;
    return { src: optimizedUrl };
  }

  return { src };
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
  ...props
}: HeicImageProps) {
  const result = buildSrcSet(src, size);

  // No image → render nothing
  if (!result) return null;

  // Auto-determine loading priority from grid position
  // First 4 images (above fold on mobile) → eager+high (helps LCP)
  // Rest → lazy+low (saves bandwidth, faster initial render)
  const aboveFold = index !== undefined ? index < 4 : (size === 'full' || size === 'hero');
  const resolvedLoading  = loading   ?? (aboveFold ? 'eager' : 'lazy');
  const resolvedPriority = fetchpriority ?? (aboveFold ? 'high' : 'low');

  return (
    <img
      src={result.src}
      srcSet={result.srcSet}
      sizes={result.sizes}
      alt={alt}
      className={className}
      style={{
        // Warm placeholder prevents layout shift before image paints
        backgroundColor: '#f0ede8',
        ...style,
      }}
      loading={resolvedLoading}
      decoding={aboveFold ? 'sync' : 'async'}
      fetchPriority={resolvedPriority}
      {...props}
    />
  );
}
