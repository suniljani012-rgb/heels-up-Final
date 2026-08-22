// frontend/src/components/HeicImage.tsx
// Smart image renderer for R2 PNG product images:
// - PNG/JPG → weserv.nl (PNG→WebP convert + resize) → 60-70% smaller → FAST
// - HEIC/HEIF → weserv.nl converts to WebP → Browser compatible
// - WebP already → Direct CDN (no proxy needed)
// - data:/blob: → Direct (upload preview)
import React, { useState } from 'react';

const R2_CDN = 'https://media.heelsup.in';
const WESERV = 'https://images.weserv.nl/';

// Slot definitions with explicit intrinsic width/height & aspect ratio for zero CLS
const SIZE_DIMENSIONS: Record<string, { width: number; height: number; aspect: string }> = {
  thumb: { width: 480, height: 480, aspect: '1 / 1' },
  full:  { width: 900, height: 900, aspect: '1 / 1' },
  hero:  { width: 1200, height: 675, aspect: '16 / 9' },
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
 * Build an optimized image URL for a given target width:
 */
function buildOptimizedUrl(src: string, targetWidth: number): string {
  if (!src || !src.trim()) return '';

  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (src.startsWith('/') && !src.startsWith('/api/')) return src;

  const fullUrl = src.startsWith('http') ? src : `${R2_CDN}/${src}`;
  const lower = fullUrl.toLowerCase();

  // If already a WebP on R2, use CDN direct or weserv for resizing
  if (lower.endsWith('.webp') || lower.includes('.webp?')) {
    return fullUrl;
  }

  // Convert PNG / JPG / JPEG / HEIC to WebP with requested width
  return `${WESERV}?url=${encodeURIComponent(fullUrl)}&output=webp&q=80&w=${targetWidth}&fit=inside&n=-1&we=1`;
}

function getDisplaySrc(src: string | undefined, size: 'thumb' | 'full' | 'hero' = 'thumb'): string | null {
  if (!src || !src.trim()) return null;
  const w = SIZE_DIMENSIONS[size]?.width ?? 480;
  return buildOptimizedUrl(src, w);
}

function getSrcSet(src: string | undefined, size: 'thumb' | 'full' | 'hero' = 'thumb'): string | undefined {
  if (!src || !src.trim()) return undefined;
  if (src.startsWith('data:') || src.startsWith('blob:') || (src.startsWith('/') && !src.startsWith('/api/'))) {
    return undefined;
  }

  if (size === 'thumb') {
    return `${buildOptimizedUrl(src, 240)} 240w, ${buildOptimizedUrl(src, 480)} 480w, ${buildOptimizedUrl(src, 720)} 720w`;
  }
  if (size === 'full') {
    return `${buildOptimizedUrl(src, 480)} 480w, ${buildOptimizedUrl(src, 900)} 900w, ${buildOptimizedUrl(src, 1200)} 1200w`;
  }
  if (size === 'hero') {
    return `${buildOptimizedUrl(src, 720)} 720w, ${buildOptimizedUrl(src, 1200)} 1200w, ${buildOptimizedUrl(src, 1600)} 1600w`;
  }
  return undefined;
}

function getSizes(size: 'thumb' | 'full' | 'hero' = 'thumb'): string | undefined {
  if (size === 'thumb') {
    return '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px';
  }
  if (size === 'full') {
    return '(max-width: 768px) 100vw, 600px';
  }
  if (size === 'hero') {
    return '100vw';
  }
  return undefined;
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
  width,
  height,
  onLoad,
  onError: customOnError,
  ...props
}: HeicImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [, setErrored] = useState(false);

  const displaySrc = getDisplaySrc(src, size);
  const dims = SIZE_DIMENSIONS[size] || SIZE_DIMENSIONS.thumb;

  if (!displaySrc) {
    return (
      <div
        className={`${className} bg-neutral-200 rounded-xl flex items-center justify-center text-neutral-500`}
        style={{
          backgroundColor: '#f5f2eb',
          aspectRatio: dims.aspect,
          width: width ?? '100%',
          height: height ?? 'auto',
          ...style,
        }}
      >
        <span className="text-xs">No Image</span>
      </div>
    );
  }

  // Only hero or 1st card above fold gets eager/high priority
  const isHeroOrTop = size === 'hero' || (index !== undefined && index === 0);
  const resolvedLoading: 'lazy' | 'eager' = loading ?? (isHeroOrTop ? 'eager' : 'lazy');
  const resolvedPriority: 'high' | 'auto' | 'low' = fetchpriority ?? (isHeroOrTop ? 'high' : 'auto');

  // Determine object-fit
  const hasFitInClass = className.includes('object-cover') || className.includes('object-contain');
  let fitClass = '';
  if (!hasFitInClass) {
    if (fit === 'cover') fitClass = 'object-cover';
    else if (fit === 'contain') fitClass = 'object-contain';
    else fitClass = size === 'hero' ? 'object-cover' : 'object-contain';
  }

  const descriptiveAlt = alt && alt.trim().length > 0 ? alt : 'HeelsUp Luxury Handcrafted Footwear & Handbags India';
  const srcSet = getSrcSet(src, size);
  const sizes = getSizes(size);

  return (
    <img
      src={displaySrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={descriptiveAlt}
      width={width ?? dims.width}
      height={height ?? dims.height}
      className={`${className} ${fitClass} transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      style={{
        backgroundColor: '#f5f2eb',
        aspectRatio: dims.aspect,
        ...style,
      }}
      loading={resolvedLoading}
      decoding={isHeroOrTop ? 'sync' : 'async'}
      fetchPriority={resolvedPriority}
      onLoad={(e) => {
        setLoaded(true);
        if (onLoad) onLoad(e);
      }}
      onError={(e) => {
        setLoaded(true);
        setErrored(true);
        if (customOnError) {
          customOnError(e);
        } else {
          const imgEl = e.currentTarget;
          if (imgEl && src) {
            const fallback = src.startsWith('http') ? src : `${R2_CDN}/${src}`;
            if (imgEl.src !== fallback) {
              imgEl.srcset = '';
              imgEl.src = fallback;
            }
          }
        }
      }}
      {...props}
    />
  );
}
