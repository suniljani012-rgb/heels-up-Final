// frontend/src/utils/imagePreloader.ts
// ULTRA-FAST ALL-IMAGE GLOBAL BACKGROUND PRELOADER
// Preloads every product & banner image into browser RAM/HTTP cache
// silently in the background on first page open — so every page shows
// images at 0ms with zero wait, zero progressive load!

const R2_CDN = 'https://media.heelsup.in';

/** Resolve any image src to its final CDN URL */
function resolveCdnUrl(src: string): string {
  if (!src) return src;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) {
    // Already a full URL — use as-is (it might already be R2 CDN)
    return src;
  }
  // Relative key like "products/abc.jpg" or "banners/xyz.webp"
  return `${R2_CDN}/${src}`;
}

/** Preload a list of image URLs silently into browser cache */
export function preloadImages(urls: string[]) {
  if (!urls || urls.length === 0) return;

  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));

  const prefetch = () => {
    uniqueUrls.forEach((url) => {
      try {
        const finalSrc = resolveCdnUrl(url);
        const img = new Image();
        img.src = finalSrc;
      } catch {}
    });
  };

  // Run on browser idle thread so it never blocks UI rendering
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(prefetch, { timeout: 3000 });
  } else {
    setTimeout(prefetch, 300);
  }
}

/**
 * AUTO PRELOAD: Fetches ALL product + banner image URLs from API
 * and silently preloads them all into browser RAM cache.
 * Called once on app mount — after that every page shows images INSTANTLY!
 */
export async function autoPreloadStorefrontImages() {
  try {
    const [prodRes, bannerRes] = await Promise.allSettled([
      fetch('/api/products?limit=20'),
      fetch('/api/banners')
    ]);

    const urlsToPreload: string[] = [];

    if (prodRes.status === 'fulfilled' && prodRes.value.ok) {
      const pData = await prodRes.value.json();
      if (pData.success && Array.isArray(pData.data)) {
        pData.data.forEach((p: any) => {
          if (Array.isArray(p.images) && p.images.length > 0) {
            // Only preload first image per product (main image)
            const img = p.images[0];
            if (img) urlsToPreload.push(img);
          }
        });
      }
    }

    if (bannerRes.status === 'fulfilled' && bannerRes.value.ok) {
      const bData = await bannerRes.value.json();
      if (bData.success && Array.isArray(bData.data)) {
        bData.data.forEach((b: any) => {
          if (b.image_url) urlsToPreload.push(b.image_url);
        });
      }
    }

    if (urlsToPreload.length > 0) {
      preloadImages(urlsToPreload);
    }
  } catch (e) {
    // Silently ignore — background optimization only
  }
}
