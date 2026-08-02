import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://heelsup.in',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: '../public',
    emptyOutDir: true,

    // ─── Performance Optimizations ──────────────────────────────────
    // Inline assets smaller than 8KB as base64 (saves round-trips for tiny icons)
    assetsInlineLimit: 8192,

    // Code splitting: admin bundle is loaded only when user navigates to /admin.
    // Main storefront bundle is much smaller → faster initial load for shoppers.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Keep React + ReactDOM in a stable shared chunk (long-lived browser cache)
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // Framer Motion: large library, split to its own chunk
          if (id.includes('node_modules/framer-motion')) {
            return 'framer-motion';
          }
          // React Query: stable utility, deserves its own cached chunk
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'react-query';
          }
          // Lucide icons: large icon library
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide';
          }
          // heic2any is ONLY used in admin image upload — move it to admin chunk.
          // Regular shoppers NEVER download this 1.3MB library.
          if (id.includes('node_modules/heic2any') || id.includes('node_modules/libheif')) {
            return 'admin';
          }
          // Admin pages — heavy, only loaded on /admin route
          if (
            id.includes('/pages/admin/') ||
            id.includes('/pages/Admin.') ||
            id.includes('/pages/Profile.') ||
            id.includes('/utils/imageUpload')
          ) {
            return 'admin';
          }
        },
        // Hash-based file names for immutable browser caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    // Target modern browsers for smaller output (no legacy polyfills)
    target: 'es2020',

    // Minify with esbuild (fast) — terser is slower for minimal gain
    minify: 'esbuild',

    // Raise limit for known large vendor/admin chunks (heic2any, admin panel)
    // These are only ever loaded on the admin page, not by regular shoppers
    chunkSizeWarningLimit: 1500,
  },
})
