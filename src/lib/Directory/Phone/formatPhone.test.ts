/**
 * How a phone number reads on a page.
 *
 * The directory stores numbers as typed, usually as ten bare digits, which
 * readers parse with difficulty. French numbers read in pairs; the pairs are
 * joined by no-break spaces so a number never splits across two lines. The
 * tel: link keeps the stored value: this is display only.
 */
import { describe, it, expect } from 'vitest';
import { formatPhone } from './formatPhone';

const nb = ' ';

describe('formatPhone', () => {
	it('reads a French number in pairs', () => {
		expect(formatPhone('0785669268')).toBe(['07', '85', '66', '92', '68'].join(nb));
	});

	it('reads an international French number in pairs after the country code', () => {
		expect(formatPhone('+33785669268')).toBe(['+33', '7', '85', '66', '92', '68'].join(nb));
	});

	it('regroups a French number typed with dots, dashes or spaces', () => {
		expect(formatPhone('07.85.66.92.68')).toBe(['07', '85', '66', '92', '68'].join(nb));
		expect(formatPhone('07 85-66 92 68')).toBe(['07', '85', '66', '92', '68'].join(nb));
	});

	it('leaves any other number as it was typed', () => {
		expect(formatPhone('3615')).toBe('3615');
		expect(formatPhone('+44 20 7946 0958')).toBe('+44 20 7946 0958');
	});
});
