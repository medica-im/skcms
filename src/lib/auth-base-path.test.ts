import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Where Auth.js answers: `<base path>/auth`.
 *
 * @auth/sveltekit used to take the base path itself, from `base` of
 * $app/paths. SvelteKit 3 removed that export, and the library is patched
 * (patches/@auth__sveltekit@*.patch) to default to `/auth` unless told
 * otherwise. unipa.fr/annuaire is built with BASE_PATH=/annuaire: left at the
 * default, its sign-in form posts to the WordPress root and every session
 * request lands on /auth/session there.
 */

let config: { basePath?: string } = {};
let basePath = '';

vi.mock('@auth/sveltekit', () => ({
	SvelteKitAuth: (given: typeof config) => {
		config = given;
		return { handle: () => {}, signIn: () => {}, signOut: () => {} };
	}
}));
vi.mock('@auth/sveltekit/providers/google', () => ({ default: {} }));
vi.mock('$app/env/private', () => ({ AUTH_DEBUG: '' }));
vi.mock('#lib/utils/base.ts', () => ({ base: () => basePath }));

beforeEach(() => {
	vi.resetModules();
	config = {};
});

describe('the Auth.js base path', () => {
	it('is /auth on a site at the root of its domain', async () => {
		basePath = '';

		await import('./auth.ts');

		expect(config.basePath).toBe('/auth');
	});

	it('carries the base path on a site under one', async () => {
		basePath = '/annuaire';

		await import('./auth.ts');

		expect(config.basePath).toBe('/annuaire/auth');
	});
});
