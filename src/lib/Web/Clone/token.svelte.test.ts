import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cloneToken, takeTokenFromHash, clearToken } from './token.svelte';

/**
 * The clone token is a bearer credential for another deployment's directory.
 *
 * These tests are less about behaviour than about what must *not* happen: it
 * must not reach any storage API, and it must not stay in the address bar. Both
 * would outlive the tab that needed it, and a fifteen-minute credential in a
 * shared screenshot or a synced browser profile is the failure this guards.
 */
describe('takeTokenFromHash', () => {
	beforeEach(() => clearToken());

	it('takes the token out of the fragment', () => {
		const scrub = vi.fn();
		expect(takeTokenFromHash({ hash: '#token=abc123&instance=prod' }, scrub)).toBe(true);
		expect(cloneToken.value).toBe('abc123');
		expect(cloneToken.instance).toBe('prod');
	});

	it('scrubs the address bar immediately', () => {
		const scrub = vi.fn();
		takeTokenFromHash({ hash: '#token=abc123' }, scrub);
		expect(scrub, 'the token was left in the URL').toHaveBeenCalled();
	});

	it('ignores a fragment with no token', () => {
		const scrub = vi.fn();
		expect(takeTokenFromHash({ hash: '#section=2' }, scrub)).toBe(false);
		expect(cloneToken.value).toBeNull();
		expect(scrub).not.toHaveBeenCalled();
	});

	it('never writes the token to any storage', () => {
		const local = vi.spyOn(Storage.prototype, 'setItem');
		takeTokenFromHash({ hash: '#token=secret-value' }, vi.fn());
		expect(
			local.mock.calls.filter(([, v]) => String(v).includes('secret-value')),
			'the clone token reached a storage API'
		).toHaveLength(0);
		local.mockRestore();
	});

	it('is cleared on demand, so leaving the wizard drops it', () => {
		takeTokenFromHash({ hash: '#token=abc' }, vi.fn());
		clearToken();
		expect(cloneToken.value).toBeNull();
	});
});
