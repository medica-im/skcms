interface ImportMetaEnv {
	readonly VITE_GHOST_API_KEY: string,
	readonly VITE_TIMELINE: boolean
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare namespace App {
	interface Locals {
		locale: Locales
		LL: TranslationFunctions
	}

	// interface Platform { }

	// interface Stuff { }
}

declare module '@medecinelibre/timelinejs/src/js/timeline/Timeline.mjs';
declare module 'svelte-carousel';