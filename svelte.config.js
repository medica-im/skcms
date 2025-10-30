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
            name: "4.0.0"
        },
		adapter: adapter(),
		alias: {
			$assets: './src/assets',
			$msgs: './src/paraglide/messages.js',
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
    	}
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};
export default config;
