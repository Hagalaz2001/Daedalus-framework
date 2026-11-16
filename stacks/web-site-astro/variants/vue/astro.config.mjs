import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// Static output by default. Set SITE_URL to the public address: canonical links, sitemap and Open Graph use it.
export default defineConfig({
  site: process.env.SITE_URL ?? 'http://localhost:4321',
  integrations: [vue(), sitemap()],
  vite: { plugins: [tailwindcss()] },
  // Need a server-rendered page? Add an adapter and `output: 'server'` (or `prerender = false` on that page) here.
})
