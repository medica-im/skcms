import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import { purgeCss } from 'vite-plugin-tailwind-purgecss';
import { isoImport } from 'vite-plugin-iso-import';
import devtoolsJson from 'vite-plugin-devtools-json';
import 'vitest/config';
import * as path from 'path';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd());

	const API_URL = `${env.VITE_BASE_URI_DEV ?? 'http://localhost:3000'}`;
	console.log(API_URL);
	return {
		optimizeDeps: {
			include: ['lodash.get', 'lodash.isequal', 'lodash.clonedeep'],
		},
		plugins: [
			devtoolsJson(),
			paraglideVitePlugin(
				{
					project: './project.inlang',
					outdir: './src/paraglide',
					strategy: ['preferredLanguage', 'baseLocale'],
				}
			),
			sveltekit(),
			isoImport() /*, purgeCss()*/
		],
		resolve: {
			alias: {
				'$': path.resolve(__dirname, 'src'),
				'$msgs': path.resolve('./src/paraglide/messages/_index.js'),
				'$prgld': path.resolve('./src/paraglide/'),
				'$var': path.resolve('./src/var')
			}
		},
		server: {
			proxy: {
				'/media/profile_images': API_URL,
				'/api/v2': API_URL,
				'/api/v1': API_URL,
				'/blog': API_URL
			}
		}
	}
});