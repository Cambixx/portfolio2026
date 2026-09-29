import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

/**
 * Preloads the Latin font files the first screen needs. Without a hint they
 * are only discovered once the stylesheet has downloaded and parsed, and the
 * intro waits for them (document.fonts.ready) before it samples the name.
 * The hashed file names only exist after bundling, so the tags are injected
 * here rather than written into index.html.
 */
function preloadFonts(patterns) {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        return Object.keys(ctx.bundle ?? {})
          .filter((file) => patterns.some((pattern) => pattern.test(file)))
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head',
          }))
      },
    },
  }
}

// Libraries change far less often than the app. In chunks of their own they
// stay cached across deploys, and download in parallel with the app code.
const VENDOR_CHUNKS = {
  three: /node_modules\/three\//,
  react: /node_modules\/(react|react-dom|scheduler)\//,
  motion: /node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//,
  gsap: /node_modules\/gsap\//,
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    preloadFonts([
      /outfit-latin-wght-normal-[\w-]+\.woff2$/,
      /space-mono-latin-(400|700)-normal-[\w-]+\.woff2$/,
    ]),
  ],
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          for (const [name, pattern] of Object.entries(VENDOR_CHUNKS)) {
            if (pattern.test(id)) return name
          }
        },
      },
    },
  },
})
