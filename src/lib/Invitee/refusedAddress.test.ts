import { describe, it, expect } from 'vitest';
import { addressStillRefused } from './refusedAddress';

/**
 * Once the backend refuses an address — an invitation to it already exists, or
 * it already belongs to a member — submitting it again can only be refused
 * again. The form stays blocked until the address is actually different, and
 * "different" is judged as the backend judges it: regardless of case and of
 * surrounding spaces.
 */
describe('addressStillRefused', () => {
	const refusal = ['Une invitation adressée à a@b.fr existe déjà.'];

	it('holds while the refused address is unchanged', () => {
		expect(addressStillRefused(refusal, 'a@b.fr', 'a@b.fr')).toBe(true);
	});

	it('holds when only the case or the spacing changed', () => {
		expect(addressStillRefused(refusal, 'a@b.fr', '  A@B.fr ')).toBe(true);
	});

	it('lifts as soon as the address is different', () => {
		expect(addressStillRefused(refusal, 'a@b.fr', 'c@b.fr')).toBe(false);
	});

	it('does not apply when nothing was refused', () => {
		expect(addressStillRefused([], 'a@b.fr', 'a@b.fr')).toBe(false);
	});

	it('does not apply before anything was submitted', () => {
		expect(addressStillRefused(refusal, null, 'a@b.fr')).toBe(false);
	});
});
