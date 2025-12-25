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
	console.log("API_URL", API_URL);
	return {
		optimizeDeps: {
			include: ['lodash.get', 'lodash.isequal', 'lodash.clonedeep'],
		},
		plugins: [
			devtoolsJson(),
			sveltekit(),
			paraglideVitePlugin(
				{
					project: './project.inlang',
					outdir: './src/paraglide',
					strategy: ['baseLocale'],
				}
			),
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
				'/media/': API_URL,
				'/api/v2': {
					target: API_URL,
					changeOrigin: true,
					secure: true,
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
					secure: true,
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