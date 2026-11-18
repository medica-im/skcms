import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * SvelteKit 3 removed `base` from $app/paths. Its migration replaced every use
 * with `resolve('')`, which is `base + '/'`: on a site at its own root that is
 * '/', so `${resolve('')}/signout` became `//signout`, a protocol-relative URL
 * the browser sent to the host "signout", and every `{resolve('')}/web/...`
 * link the same. `!resolve('')`, "is there no base path", was never true.
 */

const resolve = vi.fn();
vi.mock('$app/paths', () => ({ resolve }));

const { base } = await import('./base.ts');

beforeEach(() => resolve.mockReset());

describe('base', () => {
	it('is empty on a site at the root of its domain', () => {
		resolve.mockReturnValue('/');

		expect(base()).toBe('');
	});

	it('is the base path, without a trailing slash, on a site under one', () => {
		resolve.mockReturnValue('/annuaire/');

		expect(base()).toBe('/annuaire');
	});

	it('asks for the root of the app', () => {
		resolve.mockReturnValue('/');

		base();

		expect(resolve).toHaveBeenCalledWith('');
	});
});
