import { sveltePreprocess } from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: [
		vitePreprocess({ script: true }),
		sveltePreprocess({
			postcss: true,
			scss: { includePaths: ['src', 'node_modules'] },
		})
	],
	kit: {
		version: {
            name: "7.0.0",
			pollInterval: 5000
        },
		adapter: adapter(),
		alias: {
			$assets: './src/assets',
			$msgs: './src/paraglide/messages/_index.js',
			$prgld: './src/paraglide/',
			$var: './src/routes/(skvar)/(var)'
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
