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
          const n = id.replace(/\\/g, '/');

          // 1. Core Framework & Shared Vendors Chunk (Used on public storefront)
          if (
            n.includes('node_modules/react') ||
            n.includes('node_modules/scheduler') ||
            n.includes('node_modules/use-sync-external-store') ||
            n.includes('node_modules/zustand') ||
            n.includes('node_modules/clsx') ||
            n.includes('node_modules/tailwind-merge') ||
            n.includes('node_modules/class-variance-authority') ||
            n.includes('node_modules/@radix-ui') ||
            n.includes('node_modules/dompurify')
          ) {
            return 'react-vendor';
          }
          // 2. Framer Motion
          if (n.includes('node_modules/framer-motion/')) {
            return 'framer-motion';
          }
          // 3. React Query
          if (n.includes('node_modules/@tanstack/react-query/')) {
            return 'react-query';
          }
          // 4. Lucide icons
          if (n.includes('node_modules/lucide-react/')) {
            return 'lucide';
          }
          // 5. HEIC converter — isolated standalone chunk, only downloaded if converting HEIC
          if (
            n.includes('node_modules/heic2any/') ||
            n.includes('node_modules/libheif/')
          ) {
            return 'heic2any';
          }
        },
        // Hash-based file names for immutable browser caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    // Target modern browsers for smaller output (no legacy polyfills)
    target: 'es2022',

    // Minify with esbuild (fast) — terser is slower for minimal gain
    minify: 'esbuild',

    // Raise limit for known large vendor/admin chunks (heic2any, admin panel)
    chunkSizeWarningLimit: 1500,
  },
})
