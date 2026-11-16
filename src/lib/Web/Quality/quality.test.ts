/**
 * The quality controls' answers (backend directory/quality.py), worded for the pages.
 *
 * The backend sends codes and a severity; every code needs a sentence a person can act on, in
 * both languages, or a rule added there would show a raw code to the person editing the entry.
 */
import { describe, it, expect } from 'vitest';
import { QUALITY_RULES, qualityText, bySeverity } from './quality.ts';

describe('qualityText', () => {
	it('words every rule the backend can raise', () => {
		for (const code of QUALITY_RULES) {
			const text = qualityText(code);
			expect(text, code).toBeTruthy();
			expect(text, code).not.toMatch(/^QUALITY_/);
		}
	});

	it('names the fix for a ligne d\'écoute without a phone', () => {
		expect(qualityText('line_without_phone')).toMatch(/téléphone/i);
	});

	it('says a day hospital lacks a day at the hospital', () => {
		expect(qualityText('day_hospital_without_day_hospitalisation')).toMatch(/hospitalisation de jour/);
	});

	it('falls back to the code itself for a rule this page does not know yet', () => {
		expect(qualityText('a_rule_added_later')).toBe('a_rule_added_later');
	});
});

describe('bySeverity', () => {
	const items = [
		{ code: 'no_description', severity: 'incomplete' },
		{ code: 'no_contact', severity: 'missing' },
		{ code: 'no_offers', severity: 'incomplete' }
	];

	it('puts what is missing first and keeps the order within a severity', () => {
		expect(bySeverity(items).map((group) => [group.severity, group.items.map((i) => i.code)])).toEqual([
			['missing', ['no_contact']],
			['incomplete', ['no_description', 'no_offers']]
		]);
	});

	it('leaves out a severity with nothing in it', () => {
		expect(bySeverity([items[0]]).map((group) => group.severity)).toEqual(['incomplete']);
		expect(bySeverity([])).toEqual([]);
	});
});
