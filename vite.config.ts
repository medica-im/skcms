import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import { purgeCss } from 'vite-plugin-tailwind-purgecss';
import devtoolsJson from 'vite-plugin-devtools-json';
import 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import * as path from 'path';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd());
	const API_URL = `${env.VITE_BASE_URI_DEV ?? 'http://localhost:3000'}`;
	console.log("API_URL", API_URL);
	return {
		plugins: [
			devtoolsJson(),
			sveltekit(),
			paraglideVitePlugin(
				{
					project: './project.inlang',
					outdir: './src/paraglide',
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
						exclude: ['**/node_modules/**', 'src/**/*.svelte.{test,spec}.{js,ts}']
					}
				},
				{
					// Mounted components. A real browser rather than jsdom: Skeleton
					// components and anything asserting on computed style or layout
					// do not behave faithfully under a DOM shim.
					extends: true,
					test: {
						name: 'component',
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
				'$msgs': path.resolve('./src/paraglide/messages/_index.js'),
				'$prgld': path.resolve('./src/paraglide/'),
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