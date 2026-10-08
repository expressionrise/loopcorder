import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the same build works on Netlify (root) and GitHub Pages (/loopcorder/).
  base: './',
  // The audio worklet must stay a real file (not a data: URI) so it can be precached.
  build: { assetsInlineLimit: 0 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'] },
      manifest: {
        name: 'Loopcorder',
        short_name: 'Loopcorder',
        description: 'Mobilny looper audio w przeglądarce.',
        lang: 'pl',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#16171a',
        background_color: '#16171a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node', include: ['test/**/*.test.js'] },
});
