import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// 部署到 GitHub Pages: https://phoenixwsl.github.io/fatboy-quest/
// 如果仓库名不同，改下面的 base
export default defineConfig({
  base: '/fatboy-quest/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: '肥仔大闯关',
        short_name: '肥仔闯关',
        description: '太空主题作业管理 - 每天打怪、收集积分、解锁奖励',
        theme_color: '#0b1026',
        background_color: '#050818',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/fatboy-quest/',
        scope: '/fatboy-quest/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: '/fatboy-quest/index.html',
      },
    }),
  ],
});
