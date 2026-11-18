import { defineEnvVars } from '@sveltejs/kit/env';

// @migration-task Review usage of dynamic environment variables. They fall back to the empty string if not present, which may not be what you want.
// @migration-task Review usage of dynamic environment variables. They fall back to the empty string if not present, which may not be what you want.
// @migration-task Review usage of dynamic environment variables. They fall back to the empty string if not present, which may not be what you want.
export const variables = defineEnvVars({
	DEBUG_MODE: { schema: (input) => input ?? '' },
	SITE_THEME: { schema: (input) => input ?? '' },
	PUBLIC_PLAUSIBLE_SCRIPT_SRC: { public: true, static: true },
	GHOST_API_KEY: { static: true },
	GHOST_ADMIN_API_KEY: { static: true },
	GHOST_POST_COUNT: { static: true },
	PUBLIC_BLOG_URI: { public: true, static: true },
	PUBLIC_HEATWAVE_RISK_LEVEL_CODE: { public: true, static: true, schema: (value) => value },
	PUBLIC_HEATWAVE_START_EVENT_DATE: { public: true, static: true, schema: (value) => value },
	PUBLIC_HEATWAVE_STOP_EVENT_DATE: { public: true, static: true, schema: (value) => value },
	AUTH_DEBUG: { static: true },
	// Read by @auth/sveltekit through $env/dynamic/private, which in SvelteKit 3
	// holds only the variables declared here: undeclared, Auth.js sees none of
	// them and every request fails with MissingSecret.
	AUTH_SECRET: {},
	AUTH_GOOGLE_ID: {},
	AUTH_GOOGLE_SECRET: {},
	AUTH_URL: { schema: (value) => value },
	AUTH_TRUST_HOST: { schema: (value) => value },
	AUTH_REDIRECT_PROXY_URL: { schema: (value) => value },
	PUBLIC_SSR_API_URL: { public: true, static: true },
	PUBLIC_INPUT_GEOCODER: { public: true, static: true },
	PUBLIC_INPUT_CATEGORY: { public: true, static: true },
	PUBLIC_INPUT_COMMUNE: { public: true, static: true },
	PUBLIC_INPUT_FACILITY: { public: true, static: true },
	PUBLIC_INPUT_SEARCH: { public: true, static: true },
	PUBLIC_INPUT_SITUATION: { public: true, static: true },
	PUBLIC_VITE_TIMELINE: { public: true, static: true },
	PUBLIC_ENTRIES_LIMIT: { public: true, static: true },
	PUBLIC_DEFAULT_LANGUAGE: { public: true, static: true },
	PUBLIC_HASH: { public: true, static: true },
	PUBLIC_LOCALE: { public: true, static: true }
});
