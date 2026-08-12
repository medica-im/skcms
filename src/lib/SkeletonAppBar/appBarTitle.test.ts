/**
 * Which organisation name the app bar shows.
 *
 * The rule: a *connected* user gets the short label ("MSP Gadagne") when the
 * organisation has one, because a signed-in user already knows which site they
 * are on and the app bar's trail fills up with their own account controls —
 * the full "Maison de santé de Gadagne" pushes them around. An anonymous
 * visitor keeps the full name, which is what identifies the site to someone
 * arriving on it for the first time.
 *
 * The short label is optional: most organisations have none, and it must never
 * be allowed to blank the app bar. Every "no usable short label" shape
 * therefore falls back to the full name rather than to an empty title.
 *
 * Capitalisation is deliberately left to the caller — `capitalizeFirstLetter`
 * is locale-aware and already applied at the call site.
 */
import { describe, it, expect } from 'vitest';
import { appBarTitle } from './appBarTitle.ts';

const GADAGNE = {
	formatted_name: 'maison de santé de Gadagne',
	formatted_name_short: 'MSP Gadagne'
};

describe('appBarTitle', () => {
	describe('when a user is connected', () => {
		it('prefers the short label', () => {
			expect(appBarTitle(GADAGNE, true)).toBe('MSP Gadagne');
		});

		it('falls back to the full name when there is no short label', () => {
			expect(appBarTitle({ formatted_name: 'maison de santé de Gadagne' }, true)).toBe(
				'maison de santé de Gadagne'
			);
		});

		it('falls back to the full name when the short label is empty', () => {
			expect(appBarTitle({ ...GADAGNE, formatted_name_short: '' }, true)).toBe(
				'maison de santé de Gadagne'
			);
		});

		it('falls back to the full name when the short label is only whitespace', () => {
			expect(appBarTitle({ ...GADAGNE, formatted_name_short: '   ' }, true)).toBe(
				'maison de santé de Gadagne'
			);
		});
	});

	describe('when no user is connected', () => {
		it('keeps the full name even though a short label exists', () => {
			expect(appBarTitle(GADAGNE, false)).toBe('maison de santé de Gadagne');
		});
	});

	describe('when the organisation is missing', () => {
		it('returns an empty string rather than throwing', () => {
			expect(appBarTitle(undefined, true)).toBe('');
			expect(appBarTitle(undefined, false)).toBe('');
		});
	});
});
