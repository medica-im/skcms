import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import { purgeCss } from 'vite-plugin-tailwind-purgecss';
import devtoolsJson from 'vite-plugin-devtools-json';
import 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import * as path from 'path';

// Where the compiled i18n messages go. Per dev server when several run from
// this checkout at once — see the note on the plugin's outdir below.
const PARAGLIDE_OUT_DIR = process.env.PARAGLIDE_OUT_DIR || './src/paraglide';

// Where dependency pre-bundling is cached. Per dev server for the same reason
// as the outdir above: four servers optimizing deps into the default shared
// node_modules/.vite invalidate each other's module graph mid-flight, and the
// losers' SSR module requests never resolve — every route then 500s with
// "transport invoke timed out" until they are restarted.
const CACHE_DIR = process.env.VITE_CACHE_DIR;

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd());
	const API_URL = `${env.VITE_BASE_URI_DEV ?? 'http://localhost:3000'}`;
	console.log("API_URL", API_URL);
	return {
		// Spread rather than set outright, so an ordinary `vite dev` keeps
		// Vite's own default (node_modules/.vite) instead of an undefined.
		...(CACHE_DIR ? { cacheDir: CACHE_DIR } : {}),
		plugins: [
			devtoolsJson(),
			sveltekit(),
			paraglideVitePlugin(
				{
					project: './project.inlang',
					// Normally ./src/paraglide. Overridable because the plugin
					// *clears* this directory before writing, and the BDD suite
					// runs one dev server per Playwright worker from this single
					// checkout (scripts/e2e-workers.sh): sharing the outdir has
					// them deleting each other's messages mid-write, leaving
					// src/paraglide/messages empty and every page 500ing on
					// "Cannot find module '$msgs'".
					outdir: PARAGLIDE_OUT_DIR,
					strategy: ['baseLocale'],
				}
			)
		],
		test: {
			// Two projects, split by what they need to run.
			//
			// Everything under tests/, features/ and .features-gen/ belongs to
			// Playwright and must not be run by vitest in either project.
			projects: [
				{
					// Plain logic: pure functions, no component, no DOM. Milliseconds.
					extends: true,
					test: {
						name: 'unit',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						// .svelte.test.ts files mount components and belong to the
						// browser project below.
						exclude: ['**/node_modules/**', 'src/**/*.svelte.{test,spec}.{js,ts}'],
						// Blocks ssh/scp/rsync/docker for every unit test, not just
						// the one that was found reaching production. See the file
						// for what went wrong and why a PATH fake is what catches
						// it — vitest cannot intercept a subprocess, and the tests
						// that reached out were shelling out to a real script.
						setupFiles: ['./src/lib/test-sandbox.ts']
					}
				},
				{
					// Mounted components. A real browser rather than jsdom: Skeleton
					// components and anything asserting on computed style or layout
					// do not behave faithfully under a DOM shim.
					extends: true,
					test: {
						name: 'component',
						// Run with BASE_PATH empty:
						//
						//     BASE_PATH= pnpm exec vitest run --project component
						//
						// kit serves the app under paths.base, while vitest's
						// browser runner connects to the server root, so a
						// context whose env file sets BASE_PATH=/annuaire makes
						// every file die with "Failed to connect to the browser
						// session within the timeout" — a hang, not an
						// assertion, which reads like a broken suite.
						//
						// Emptying the variable is enough; nothing about these
						// tests depends on the base path, since they mount
						// components directly rather than navigating. The unit
						// project needs no such treatment and covers both
						// values, its tests importing `base` rather than
						// assuming a literal.
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['**/node_modules/**'],
						browser: {
							enabled: true,
							provider: playwright(),
							headless: true,
							instances: [{ browser: 'chromium' }]
						}
					}
				}
			]
		},
		resolve: {
			alias: {
				'$': path.resolve(__dirname, 'src'),
				// Follow PARAGLIDE_OUT_DIR, or these resolve to a directory the
				// plugin is not writing to.
				'$msgs': path.resolve(`${PARAGLIDE_OUT_DIR}/messages/_index.js`),
				'$prgld': path.resolve(PARAGLIDE_OUT_DIR),
				'$var': path.resolve('./src/var')
			}
		},
		server: {
			host: true,
			// Vite rejects requests whose Host header it doesn't recognize
			// (DNS-rebinding protection). Nginx forwards the real
			// dev.<site> Host through, so that hostname must be allowed —
			// derived from API_URL rather than hardcoded so every
			// scripts/dev.sh context keeps working.
			//
			// '.dev.medica.im' additionally allows every subdomain of it (Vite
			// treats a leading dot as a suffix match), which is what the BDD
			// suite's per-worker hosts w0…wN.dev.medica.im need: each Playwright
			// worker browses its own hostname so the backend resolves it to its
			// own Site, and workers stop contending over one dataset. All of
			// them are served by this single dev server, so one entry covers any
			// number of workers — see scripts/nginx/e2e-workers.conf.
			allowedHosts: [new URL(API_URL).hostname, '.dev.medica.im'],
			watch: {
				ignored: [
					'**/node_modules/**',
					'**/.git/**',
					'**/build/**',
					'**/.svelte-kit/**',
					'**/dist/**'
				]
			},
			proxy: {
				'/media/': API_URL,
				'/api/v2': {
					target: API_URL,
					changeOrigin: true,
					secure: false,
					configure: (proxy, _options) => {
						proxy.on('error', (err, _req, _res) => {
							console.log('proxy error', err);
						});
						proxy.on('proxyReq', (proxyReq, req, _res) => {
							console.log('Sending Request to the Target:', req.method, req.url);
						});
						proxy.on('proxyRes', (proxyRes, req, _res) => {
							console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
						});
					},
				},
				'/api/v1': {
					target: API_URL,
					changeOrigin: true,
					secure: false,
					configure: (proxy, _options) => {
						proxy.on('error', (err, _req, _res) => {
							console.log('proxy error', err);
						});
						proxy.on('proxyReq', (proxyReq, req, _res) => {
							console.log('Sending Request to the Target:', req.method, req.url);
						});
						proxy.on('proxyRes', (proxyRes, req, _res) => {
							console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
						});
					},
				},
				'/blog': API_URL
			}
		}
	}
});