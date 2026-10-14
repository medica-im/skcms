import { describe, it, expect } from 'vitest';
import { isContactPath } from './contactPath';

describe('isContactPath', () => {
	it('matches /contact, with or without a trailing slash', () => {
		expect(isContactPath('/contact', '')).toBe(true);
		expect(isContactPath('/contact/', '')).toBe(true);
	});

	it('matches under the base path, and only there', () => {
		expect(isContactPath('/annuaire/contact', '/annuaire')).toBe(true);
		expect(isContactPath('/annuaire/contact/', '/annuaire')).toBe(true);
		expect(isContactPath('/contact', '/annuaire')).toBe(false);
	});

	it('does not match a longer path that starts the same way', () => {
		expect(isContactPath('/contactez-nous', '')).toBe(false);
		expect(isContactPath('/contact/form', '')).toBe(false);
	});
});
