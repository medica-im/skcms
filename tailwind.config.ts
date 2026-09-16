import { join } from 'path';
import type { Config } from 'tailwindcss';

// 1. Import the Skeleton plugin
import { skeleton } from '@skeletonlabs/tw-plugin';
import { unipaTheme } from './src/lib/themes/unipa';
import typography from '@tailwindcss/typography';
import forms from '@tailwindcss/forms';

const config = {
	darkMode: 'media',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		join(require.resolve(
			'@skeletonlabs/skeleton'),
			'../**/*.{html,js,svelte,ts}'
		)
	],
	theme: {
		extend: {}
	},
	plugins: [
		typography,
		forms,
		skeleton({
			themes: {
				// Built for the instance embedded in unipa.fr, which should not
				// arrive in the middle of that site wearing a different palette.
				// Shipped to every site like the presets are — a theme is only
				// active when something selects it, and only unipa's env does.
				custom: [unipaTheme],
				preset: [
					{ name: 'crimson', enhancements: true },
					{ name: 'gold-nouveau', enhancements: true },
					{ name: 'hamlindigo', enhancements: true },
					{ name: 'modern', enhancements: true },
					{ name: 'rocket', enhancements: true },
					{ name: 'sahara', enhancements: true },
					{ name: 'seafoam', enhancements: true },
					{ name: 'skeleton', enhancements: true },
					{ name: 'vintage', enhancements: true },
					{ name: 'wintry', enhancements: true }
				]
			}
		})
	]
} satisfies Config;

export default config;