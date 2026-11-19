interface ImportMetaEnv {
	readonly VITE_GHOST_API_KEY: string;
	readonly VITE_TIMELINE: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare namespace App {
	interface Locals {
		locale: Locales;
		LL: TranslationFunctions;
	}

	// interface Platform { }

	// interface Stuff { }
}

declare module '@medecinelibre/timelinejs/src/js/timeline/Timeline.mjs';

// Ships no types, and TypeScript 6 no longer lets an untyped module pass.
declare module 'esm-seedrandom' {
	export function prng_alea(seed: string): () => number;
}
