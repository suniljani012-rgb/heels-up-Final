// worker/src/routes/upload.js
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { ok, error, serverError, notFound } from '../utils/response.js';

const MAX_SIZE = 50 * 1024 * 1024; // 50MB raw input cap (client converts all images to WebP before upload)
const ALLOWED_EXTENSIONS = [
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'svg',
    'tiff', 'tif', 'bmp', 'jfif', 'avif', 'ico', 'apng', 'raw'
];

export async function uploadRouter(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;
    if (path.startsWith('/api/admin/upload')) {
        path = path.replace('/api/admin/upload', '') || '/';
    } else {
        path = path.replace('/api/upload', '') || '/';
    }
    const method = request.method;

    // GET /api/upload?key=xxx&w=400&q=75 — serve file from R2, with optional on-the-fly compression
    // ?w  = target width in pixels (e.g. 400 for grid thumbnails, 900 for product detail)
    // ?q  = quality 1-100 (e.g. 75 for thumbnails, 85 for detail)
    // Without w/q: non-HEIC → 301 redirect to CDN (zero Worker overhead)
    //              HEIC     → CF Image Resizing for format conversion
    if (method === 'GET') {
        try {
            let key = url.searchParams.get('key');
            if (!key && path && path !== '/') {
                key = path.startsWith('/') ? path.slice(1) : path;
            }
            if (!key) return error('key required');
            const bucket = env.MEDIA || env.BUCKET;
            if (!bucket) return error('R2 bucket binding not found', 500);

            const isHeic = key.toLowerCase().endsWith('.heic') || key.toLowerCase().endsWith('.heif');

            // Parse optional resize params
            const wParam = url.searchParams.get('w');
            const qParam = url.searchParams.get('q');
            const targetWidth  = wParam ? parseInt(wParam, 10) : null;
            const targetQuality = qParam ? Math.min(100, Math.max(1, parseInt(qParam, 10))) : 75;
            const wantsResize  = !!targetWidth; // only resize when ?w= is present

            // ─── RESIZE PATH: ?w= present → compress via CF Image Resizing ───
            // Returns WebP/AVIF compressed to targetWidth and targetQuality.
            // Response is cached immutably (browser + CDN edge cache).
            if (wantsResize && env.R2_PUBLIC_URL) {
                const ua = request.headers.get('user-agent') || '';
                const via = request.headers.get('via') || '';
                const isResizingLoop = ua.includes('Cloudflare-Image-Resizing') || via.includes('image-resizing');

                if (!isResizingLoop) {
                    const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
                    const accept = request.headers.get('accept') || '';
                    const supportsAvif = accept.includes('image/avif');
                    const supportsWebp = accept.includes('image/webp');
                    const targetFormat = supportsAvif ? 'avif' : (supportsWebp ? 'webp' : 'jpeg');

                    try {
                        const resized = await fetch(publicUrl, {
                            cf: {
                                image: {
                                    width: targetWidth,
                                    quality: targetQuality,
                                    format: targetFormat,
                                    fit: 'scale-down', // never upscale, only shrink
                                }
                            }
                        });

                        if (resized.ok) {
                            const headers = new Headers();
                            const ct = resized.headers.get('content-type');
                            headers.set('Content-Type', ct || `image/${targetFormat}`);
                            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
                            headers.set('CDN-Cache-Control', 'public, max-age=31536000, immutable');
                            headers.set('Vary', 'Accept'); // correct caching per Accept header
                            const origin = request.headers.get('Origin') || '';
                            const allowedOrigins = ['https://heelsup.in', 'https://www.heelsup.in', 'https://heelsupnew.heelsup.workers.dev'];
                            headers.set('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '*');
                            return new Response(resized.body, { status: 200, headers });
                        }
                    } catch (resizeErr) {
                        // CF Image Resizing not available (free plan or not enabled) — fall through to direct CDN
                        console.warn('CF Image Resizing unavailable, falling back to direct CDN:', resizeErr.message);
                    }
                }

                // Fallback: 301 permanent redirect to CDN without resize
                return Response.redirect(`${env.R2_PUBLIC_URL}/${key}`, 301);
            }

            // ─── FAST PATH: Non-HEIC, no resize → 301 redirect to R2 CDN (zero Worker overhead) ───
            if (env.R2_PUBLIC_URL && !isHeic) {
                return Response.redirect(`${env.R2_PUBLIC_URL}/${key}`, 301);
            }

            // ─── HEIC PATH: HEIC/HEIF → convert via CF Image Resizing ───
            const ua2 = request.headers.get('user-agent') || '';
            const via2 = request.headers.get('via') || '';
            const isImageResizingService = ua2.includes('Cloudflare-Image-Resizing') || via2.includes('image-resizing');

            if (env.R2_PUBLIC_URL && isHeic && !isImageResizingService) {
                const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
                const accept = request.headers.get('accept') || '';
                const supportsAvif = accept.includes('image/avif');
                const supportsWebp = accept.includes('image/webp');
                const targetFormat = supportsAvif ? 'avif' : (supportsWebp ? 'webp' : 'jpeg');
                try {
                    const optimizedRes = await fetch(publicUrl, {
                        cf: { image: { format: targetFormat, quality: 85 } }
                    });
                    if (optimizedRes.ok) {
                        const headers = new Headers();
                        if (optimizedRes.headers.has('content-type')) headers.set('Content-Type', optimizedRes.headers.get('content-type'));
                        if (optimizedRes.headers.has('last-modified')) headers.set('Last-Modified', optimizedRes.headers.get('last-modified'));
                        if (optimizedRes.headers.has('etag')) headers.set('ETag', optimizedRes.headers.get('etag'));
                        const origin = request.headers.get('Origin') || '';
                        const allowedOrigins = ['https://heelsup.in', 'https://www.heelsup.in', 'https://heelsupnew.heelsup.workers.dev'];
                        headers.set('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '*');
                        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
                        headers.set('CDN-Cache-Control', 'public, max-age=31536000, immutable');
                        return new Response(optimizedRes.body, { status: optimizedRes.status, headers });
                    }
                } catch (fetchErr) {
                    console.warn('HEIC CF Image Resizing failed, falling back to direct R2:', fetchErr);
                }
            }

            // Last resort: serve raw from R2 bucket
            const object = await bucket.get(key);
            if (!object) return notFound('File not found');

            const headers = new Headers();
            object.writeHttpMetadata(headers);
            if (isHeic) headers.set('Content-Type', 'image/jpeg');

            const origin = request.headers.get('Origin') || '';
            const allowedOrigins = ['https://heelsup.in', 'https://www.heelsup.in', 'https://heelsupnew.heelsup.workers.dev'];
            headers.set('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '*');
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            headers.set('CDN-Cache-Control', 'public, max-age=31536000, immutable');

            return new Response(object.body, { headers });
        } catch (e) {
            console.error('Serve error:', e);
            return serverError('Failed to serve file');
        }
    }


    // POST /api/upload — upload image to R2
    if (path === '/' && method === 'POST') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const formData = await request.formData();
            let files = [
                ...formData.getAll('files'),
                ...formData.getAll('file'),
                ...formData.getAll('images'),
                ...formData.getAll('image')
            ].filter(f => f && typeof f !== 'string' && typeof f.arrayBuffer === 'function');

            if (!files || files.length === 0) {
                return error('No files provided in FormData under fields files/file/images/image.', 400);
            }

            const bucket = env.MEDIA || env.BUCKET;
            if (!bucket) return error('R2 bucket binding (MEDIA/BUCKET) not configured on Cloudflare Worker', 500);

            const results = await Promise.all(files.map(async (file) => {
                const rawName = file.name || 'image.webp';
                const rawExt = rawName.includes('.') ? rawName.split('.').pop().toLowerCase() : '';
                const mimeType = (file.type || '').toLowerCase();

                const isHeicExt = ['heic', 'heif'].includes(rawExt);
                const isHeic = isHeicExt;
                const isHeicType = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'].includes(mimeType);

                if (isHeic || isHeicType) {
                    throw new Error(`HEIC/HEIF formats are not natively supported by browsers. Please upload images in JPEG, PNG, WebP, or GIF format.`);
                }

                let buffer = await file.arrayBuffer();
                if (!buffer || buffer.byteLength === 0) {
                    throw new Error(`File "${rawName}" is empty (0 bytes).`);
                }

                if (buffer.byteLength > MAX_SIZE) {
                    throw new Error(`File "${rawName}" exceeds maximum allowed limit of 50MB (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB).`);
                }

                // Determine final file extension and Content-Type header for R2
                // Defaults to image/webp / image/jpeg for browser compatibility
                let finalExt = 'webp';
                let contentType = 'image/webp';

                if (rawExt === 'png' || mimeType.includes('png')) {
                    finalExt = 'png';
                    contentType = 'image/png';
                } else if (['jpg', 'jpeg', 'jfif', 'heic', 'heif'].includes(rawExt) || mimeType.includes('jpeg') || mimeType.includes('jpg') || mimeType.includes('heic') || mimeType.includes('heif')) {
                    finalExt = 'jpg';
                    contentType = 'image/jpeg';
                } else if (rawExt === 'gif' || mimeType.includes('gif')) {
                    finalExt = 'gif';
                    contentType = 'image/gif';
                } else if (rawExt === 'svg' || mimeType.includes('svg')) {
                    finalExt = 'svg';
                    contentType = 'image/svg+xml';
                } else if (rawExt === 'avif' || mimeType.includes('avif')) {
                    finalExt = 'avif';
                    contentType = 'image/avif';
                }

                const finalKey = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${finalExt}`;

                // Store in R2 bucket with explicit Content-Type metadata header
                await bucket.put(finalKey, buffer, {
                    httpMetadata: { contentType },
                });

                const isWorkersDev = url.hostname.endsWith('.workers.dev') || url.hostname.endsWith('.pages.dev');
                const publicUrl = (env.R2_PUBLIC_URL && !isWorkersDev) 
                    ? `${env.R2_PUBLIC_URL}/${finalKey}` 
                    : `${url.origin}/api/upload?key=${encodeURIComponent(finalKey)}`;

                return { url: publicUrl, key: finalKey, mime_type: contentType, format: finalExt };
            }));

            return ok({
                url: results[0].url,
                key: results[0].key,
                urls: results.map(r => r.url),
                keys: results.map(r => r.key)
            }, 'File(s) uploaded');
        } catch (e) {
            console.error('Upload error in Worker:', e);
            const isClientError = e.message?.includes('HEIC') || e.message?.includes('No files') || e.message?.includes('exceeds') || e.message?.includes('empty');
            return new Response(JSON.stringify({
                success: false,
                error: e.message || 'Upload failed',
                cause: String(e.cause || e.stack || e)
            }), {
                status: isClientError ? 400 : 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // DELETE /api/upload — delete from R2
    if (path === '/' && method === 'DELETE') {
        const { user, error: authError } = await requireAdmin(request, env);
        if (authError) return authError;
        try {
            const { key } = await request.json();
            if (!key) return error('key required');
            const bucket = env.MEDIA || env.BUCKET;
            if (!bucket) return error('R2 bucket binding (MEDIA) not found', 500);
            await bucket.delete(key);
            return ok(null, 'File deleted');
        } catch (e) {
            return serverError('Delete failed');
        }
    }

    return error('Route not found', 404);
}