import { defineAppConfig } from '@learn/platform-web/build/app-config.ts';

export default defineAppConfig({
  appUrl: import.meta.url,
  manifest: {
    name: 'Kids Learning',
    short_name: 'Kids Learning',
    description: 'Learn chess and math — offline, ad-free, for kids aged 8–9.',
    icons: [
      { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
});
