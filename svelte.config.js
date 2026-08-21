import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Kept in step with vite.config.ts, which passes the same value to
// paraglideVitePlugin's outdir.
const PARAGLIDE_OUT_DIR = process.env.PARAGLIDE_OUT_DIR || './src/paraglide';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: [
		vitePreprocess({ script: true }),
	],
	kit: {
		paths: {
			// Opt-in, per build. Unset — which is every site served at the root
			// of its own domain — gives '', SvelteKit's default, and every
			// `${base}` prefix in the source is then a literal no-op: the
			// emitted string is byte-identical to before.
			//
			// Set to '/annuaire' for the instance proxied under
			// unipa.fr/annuaire, whose pages would otherwise emit root-absolute
			// URLs that escape the prefix and land on WordPress. Must start
			// with '/' and not end with one.
			//
			// The nginx side and the build must always agree: prefix stripped
			// <=> built for root, prefix preserved <=> built with BASE_PATH.
			base: process.env.BASE_PATH || ''
		},
		// Normally .svelte-kit. Overridable so several dev servers can run from
		// this one checkout at once: the BDD suite gives each Playwright worker
		// its own Vite instance (scripts/e2e-workers.sh), and they would
		// otherwise overwrite each other's generated types and manifest in the
		// shared directory — every request 500s with ENOENT on proxy+layout.
		outDir: process.env.SVELTEKIT_OUT_DIR || '.svelte-kit',
		version: {
			pollInterval: 30000
        },
		adapter: adapter(),
		alias: {
			$assets: './src/assets',
			// Follow PARAGLIDE_OUT_DIR like vite.config.ts does: several dev
			// servers run from this checkout during the BDD suite and each
			// compiles its messages to its own directory.
			$msgs: `${PARAGLIDE_OUT_DIR}/messages/_index.js`,
			$prgld: `${PARAGLIDE_OUT_DIR}/`,
			$var: './src/routes/(skvar)/(var)',
			$svlt: './src/routes/(skvar)/(svlt)',
			'$routes': './src/routes',
		    '$routes/*': './src/routes/*',
			'$src': './src',
			'$src/*': './src/*',
		},
		experimental: {
			remoteFunctions: true
		},
		typescript: {
	    	config: cfg => {
        		cfg.include.push('./src/lib/auth.ts');
      		},
    	},
		prerender: {
			handleHttpError: ({ status, path, referrer, referenceType, message }) => {
				console.log("status", status);
				console.log("path", path);
				console.log("referer", referrer);
				console.log("referenceType", referenceType);
				console.log("message", message);
				// ignore deliberate link to shiny 404 page
				//if (path === '/not-found' && referrer === '/blog/how-we-built-our-404-page') {
				//	return;
				//}

				// otherwise fail the build
				//throw new Error(message);
			}
		}
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};
export default config;
