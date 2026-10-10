// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The site's public address: canonical links, Open Graph and the sitemap.
// Set SITE_URL in Vercel (Project → Settings → Environment Variables) once the
// domain is known; preview deployments fall back to their own Vercel URL.
const site = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://darkshell.nieuportlabs.cz');

export default defineConfig({
	site,
	output: 'static',
	trailingSlash: 'never',
	build: { format: 'file' },
	integrations: [sitemap()],
	prefetch: { prefetchAll: true },
	// secretjs (paying from a browser wallet on /donate) expects Node's `global`
	vite: { define: { global: 'globalThis' } },
});
