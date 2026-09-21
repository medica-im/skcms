// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types

declare global {
	namespace App {
		interface Error {
			// Extra fields passed to `error(status, { ... })` and read in +error.svelte
			type?: string;
			code?: string;
			email?: string;
		}
		interface Locals {
			/**
			 * The theme this response was rendered with — the `theme` cookie,
			 * or SITE_THEME where the visitor has never chosen one. Set in
			 * hooks.server.ts and passed to the client in +layout.server.ts,
			 * because the cookie itself is HttpOnly.
			 */
			theme?: string;
		}
		interface PageData {}
		interface PageState {
			selected?: unknown;
			editing?: unknown;
			deleting?: unknown;
			facilityCreate?: unknown;
		}
		interface Platform {}
	}
	interface Window {
		PointerEvent: any;
		TouchEvent: any;
	  }
}

declare module '@fortawesome/free-solid-svg-icons/index.es' {
	export * from '@fortawesome/free-solid-svg-icons';
  }
declare module '@fortawesome/free-regular-svg-icons/index.es' {
	export * from '@fortawesome/free-regular-svg-icons';
  }
declare module '@fortawesome/free-brands-svg-icons/index.es' {
	export * from '@fortawesome/free-brands-svg-icons';
  }

export {};
