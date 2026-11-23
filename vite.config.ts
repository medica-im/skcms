import { paraglideVitePlugin } from '@inlang/paraglide-js';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
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

// Where the env files are read and watched from, by Vite and by SvelteKit's
// env.dir alike: this checkout unless ENV_DIR says otherwise. A site server in
// a test run is pointed at one holding only its own file, so a switch of the
// .env symlink here neither restarts it nor reaches it.
const ENV_DIR = process.env.ENV_DIR;

// Per-tenant site servers in test runs (scripts/site-routes.sh): each serves
// its own skvar branch from a worktree of the submodule, through a routes
// directory that mirrors src/routes with (skvar) pointing at that worktree.
// One shared checkout made every tenant's server render whichever branch was
// checked out. Unset, both are this checkout's own.
const ROUTES_DIR = process.env.ROUTES_DIR || 'src/routes';
const SKVAR_DIR = process.env.SKVAR_DIR || './src/routes/(skvar)';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, ENV_DIR ?? process.cwd());
	const API_URL = `${env.VITE_BASE_URI_DEV ?? 'http://localhost:3000'}`;
	// BASE_PATH comes from the env FILE, not only from the environment: every
	// context is configured through .env, and the Docker build passes its
	// env_file. Read for this `mode`, so `vite --mode test.w3` takes it from
	// .env.test.w3 like the rest of its config. '' as the prefix keeps it:
	// BASE_PATH is not a PUBLIC_/VITE_ variable. A real environment variable
	// still wins, so `BASE_PATH=/annuaire pnpm build` keeps working.
	const BASE_PATH =
		process.env.BASE_PATH ?? loadEnv(mode, ENV_DIR ?? process.cwd(), '').BASE_PATH ?? '';
	console.log('API_URL', API_URL);
	return {
		// Spread rather than set outright, so an ordinary `vite dev` keeps
		// Vite's own default (node_modules/.vite) instead of an undefined.
		...(CACHE_DIR ? { cacheDir: CACHE_DIR } : {}),
		...(ENV_DIR ? { envDir: ENV_DIR } : {}),
		plugins: [
			devtoolsJson(),
			sveltekit({
				preprocess: [vitePreprocess({ script: true })],
				compilerOptions: {
					experimental: {
						async: true
					}
				},
				paths: {
					// Opt-in, per build. Unset — which is every site served at the root
					// of its own domain — gives '', SvelteKit's default.
					//
					// Set to '/annuaire' for the instance proxied under
					// unipa.fr/annuaire, whose pages would otherwise emit root-absolute
					// URLs that escape the prefix and land on WordPress. Must start
					// with '/' and not end with one.
					//
					// The nginx side and the build must always agree: prefix stripped
					// <=> built for root, prefix preserved <=> built with BASE_PATH.
					base: BASE_PATH as '' | `/${string}`,
					// Absolute paths, never relative to the page being rendered: the
					// code builds URLs as `${base()}/...` (#lib/utils/base.ts), and a
					// relative base of '.' made the sign-in form post to '//signin'.
					relative: false
				},
				// Normally .svelte-kit. Overridable so several dev servers can run from
				// this one checkout at once: the BDD suite gives each Playwright worker
				// its own Vite instance (scripts/e2e-workers.sh), and they would
				// otherwise overwrite each other's generated types and manifest in the
				// shared directory — every request 500s with ENOENT on proxy+layout.
				outDir: process.env.SVELTEKIT_OUT_DIR || '.svelte-kit',
				env: {
					dir: ENV_DIR ?? process.cwd()
				},
				files: {
					routes: ROUTES_DIR
				},
				version: {
					// What the running app compares itself against: the client polls
					// /_app/version.json, and `updated` in src/routes/+layout.svelte
					// turns the next navigation into a full page load once it differs.
					//
					// The immutable image tag, passed in by build-image.sh — the
					// builder stage cannot compute it, because .dockerignore excludes
					// .git. It names skcms *and* skvar, so a change to a site's content
					// alone still produces a new version.
					//
					// Unset in dev, where every restart is a new version and no
					// release ever happens.
					name: process.env.APP_VERSION || Date.now().toString(),
					pollInterval: 30000
				},
				adapter: adapter(),
				alias: {
					$assets: './src/assets',
					// Follow PARAGLIDE_OUT_DIR: several dev servers run from this
					// checkout during the BDD suite and each compiles its messages to
					// its own directory.
					$msgs: `${PARAGLIDE_OUT_DIR}/messages/_index.js`,
					$prgld: `${PARAGLIDE_OUT_DIR}/`,
					// The tenant's skvar wherever it is checked out; src/hooks.ts globs
					// it to decide whether /contact falls back.
					$skvar: SKVAR_DIR,
					$var: `${SKVAR_DIR}/(var)`,
					$routes: './src/routes',
					'$routes/*': './src/routes/*',
					$src: './src',
					'$src/*': './src/*'
				},
				experimental: {
					remoteFunctions: true
				},
				prerender: {
					handleHttpError: ({ status, path, referrer, referenceType, message }) => {
						console.log('status', status);
						console.log('path', path);
						console.log('referer', referrer);
						console.log('referenceType', referenceType);
						console.log('message', message);
					}
				}
			}),
			paraglideVitePlugin({
				project: './project.inlang',
				// Normally ./src/paraglide. Overridable because the plugin
				// *clears* this directory before writing, and the BDD suite
				// runs one dev server per Playwright worker from this single
				// checkout (scripts/e2e-workers.sh): sharing the outdir has
				// them deleting each other's messages mid-write, leaving
				// src/paraglide/messages empty and every page 500ing on
				// "Cannot find module '$msgs'".
				outdir: PARAGLIDE_OUT_DIR,
				strategy: ['baseLocale']
			})
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
						exclude: [
							'**/node_modules/**',
							'src/**/*.svelte.{test,spec}.{js,ts}',
							// A site's own Playwright specs, in its skvar branch.
							'src/routes/\\(skvar\\)/tests/**'
						],
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
					// Pre-bundled up front: a dependency the browser runner first meets
					// mid-run (zod, imported by a test) makes Vite re-optimise and reload,
					// which closes the browser session and leaves other files with 0 tests.
					optimizeDeps: { include: ['zod'] },
					test: {
						name: 'component',
						// The payload SvelteKit's client would have set, which the
						// generated $app/env/public reads as it is imported.
						setupFiles: ['./src/lib/test-kit-globals.ts'],
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
							// Both engines, because a component test that measures
							// resolved styles (colour, contrast, layout) can pass
							// on one and fail on the other: they do not resolve
							// every CSS variable, system colour or theme rule the
							// same way. Whichever reads worst is what some visitor
							// gets. Behavioural tests are unaffected by the second
							// instance beyond taking a little longer.
							instances: [{ browser: 'chromium' }, { browser: 'firefox' }]
						}
					}
				}
			]
		},
		resolve: {
			alias: {
				$: path.resolve(__dirname, 'src'),
				// Follow PARAGLIDE_OUT_DIR, or these resolve to a directory the
				// plugin is not writing to.
				$msgs: path.resolve(`${PARAGLIDE_OUT_DIR}/messages/_index.js`),
				$prgld: path.resolve(PARAGLIDE_OUT_DIR),
				$var: path.resolve('./src/var')
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
			// A test site server's skvar worktree (scripts/site-routes.sh) is
			// outside every directory SvelteKit lets Vite serve: its routes
			// directory only links to it, and Vite checks the resolved path.
			// Unlisted, the browser got 403 on every skvar module and no page
			// hydrated. Merged into SvelteKit's own list, not replacing it.
			...(process.env.SKVAR_DIR ? { fs: { allow: [process.env.SKVAR_DIR] } } : {}),
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
					}
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
					}
				},
				'/blog': API_URL
			}
		}
	};
});
