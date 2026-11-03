import { describe, expect, test } from 'vitest';
import { slugView, type SlugCheck } from './slugField.ts';

const free = (slug: string): SlugCheck => ({ slug, free: true, reason: null, suggestions: [] });
const taken = (slug: string): SlugCheck => ({ slug, free: false, reason: 'taken', suggestions: ['a-lyon', 'a-rue-x-lyon'] });
const invalid = (slug: string): SlugCheck => ({ slug, free: false, reason: 'invalid', suggestions: ['b'] });

const view = (over: Partial<Parameters<typeof slugView>[0]> = {}) =>
	slugView({ typed: 'cabinet', original: null, check: null, pending: false, failed: false, ...over });

describe('the form can be confirmed only with an address that is free', () => {
	test('a free slug can be confirmed', () => {
		expect(view({ check: free('cabinet') })).toMatchObject({ status: 'free', canConfirm: true });
	});

	test('a taken slug cannot, and offers free ones', () => {
		const v = view({ check: taken('cabinet') });
		expect(v).toMatchObject({ status: 'taken', canConfirm: false });
		expect(v.suggestions).toEqual(['a-lyon', 'a-rue-x-lyon']);
		expect(v.message).toMatch(/déjà/);
	});

	test('a slug that is not words and hyphens cannot', () => {
		expect(view({ typed: 'Cab!', check: invalid('Cab!') })).toMatchObject({ status: 'invalid', canConfirm: false });
	});

	test('a hyphen at the end, which is where typing stops mid-word, is named as the problem', () => {
		const v = view({ typed: 'cabinet-lyon-', check: invalid('cabinet-lyon-') });
		expect(v).toMatchObject({ status: 'invalid', canConfirm: false });
		expect(v.message).toMatch(/tiret ne peut pas/);
		expect(v.message).not.toMatch(/minuscules/);
	});

	test('but not while the field has the focus: a hyphen at the end is a word about to be typed', () => {
		const v = view({ typed: 'cabinet-lyon-', check: invalid('cabinet-lyon-'), focused: true });
		expect(v).toMatchObject({ status: 'idle', message: '', canConfirm: false });
	});

	test('it is still not confirmable while focused, and is named once the field is left', () => {
		const typed = { typed: 'cabinet-lyon-', check: invalid('cabinet-lyon-') };
		expect(view({ ...typed, focused: true }).canConfirm).toBe(false);
		expect(view({ ...typed, focused: false }).message).toMatch(/tiret ne peut pas/);
	});

	test('any other mistake is named at once, focused or not', () => {
		expect(view({ typed: 'Cabinet', check: invalid('Cabinet'), focused: true }).status).toBe('invalid');
		expect(view({ typed: 'cabinet--lyon', check: invalid('cabinet--lyon'), focused: true }).status).toBe('invalid');
		expect(view({ typed: '-cabinet', check: invalid('-cabinet'), focused: true }).status).toBe('invalid');
	});

	test('so is a hyphen at the start or a doubled one', () => {
		expect(view({ typed: '-cabinet', check: invalid('-cabinet') }).message).toMatch(/tiret ne peut pas/);
		expect(view({ typed: 'cabinet--lyon', check: invalid('cabinet--lyon') }).message).toMatch(/tiret ne peut pas/);
	});

	test('capitals, accents and spaces keep the message about lowercase letters', () => {
		expect(view({ typed: 'Cabinet Lyon', check: invalid('Cabinet Lyon') }).message).toMatch(/minuscules/);
	});

	test('nothing can be confirmed before the first answer', () => {
		expect(view({ check: null })).toMatchObject({ status: 'idle', canConfirm: false });
	});

	test('nor while the check is under way, whatever the previous answer was', () => {
		expect(view({ check: free('cabinet'), pending: true })).toMatchObject({ status: 'checking', canConfirm: false });
	});

	test('nor when the check could not be made', () => {
		expect(view({ failed: true })).toMatchObject({ status: 'error', canConfirm: false });
	});

	test('nor with an empty slug', () => {
		expect(view({ typed: '  ', check: free('') })).toMatchObject({ status: 'invalid', canConfirm: false });
	});

	test('an answer about another slug than the one typed is not an answer', () => {
		expect(view({ typed: 'cabinet-lyon', check: free('cabinet') })).toMatchObject({ canConfirm: false });
	});
});

describe('an existing facility keeping its address', () => {
	test('is not blocked, even when another facility shares that address', () => {
		const v = view({ typed: 'cabinet', original: 'cabinet', check: taken('cabinet') });
		expect(v).toMatchObject({ status: 'free', canConfirm: true, changed: false });
	});

	test('changing it warns that the old address stops working', () => {
		const v = view({ typed: 'cabinet-lyon', original: 'cabinet', check: free('cabinet-lyon') });
		expect(v).toMatchObject({ canConfirm: true, changed: true });
		expect(v.warning).toMatch(/ancienne adresse/i);
	});

	test('a new facility has nothing to warn about', () => {
		expect(view({ check: free('cabinet') }).warning).toBeNull();
	});

	test('changing it to a taken one is still refused', () => {
		const v = view({ typed: 'autre', original: 'cabinet', check: taken('autre') });
		expect(v).toMatchObject({ status: 'taken', canConfirm: false });
	});
});
