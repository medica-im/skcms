/**
 * The options of a type select. The type chosen at entry creation decides
 * whether the person's grammatical gender is asked for, so each option keeps
 * the type's nature beside its uid and name.
 */
import { describe, expect, it } from 'vitest';
import { getTypeItems } from './SelectCategory.ts';
import type { EffectorType } from '$lib/interfaces/v2/effector';

const type = (uid: string, name_fr: string, nature: EffectorType['nature']) =>
	({ uid, name_fr, label_fr: name_fr, synonyms_fr: null, definition_fr: null, slug_fr: uid, nature }) as EffectorType;

describe('getTypeItems', () => {
	it('keeps each type’s nature on its option', () => {
		const items = getTypeItems([type('t-pharmacy', 'pharmacie', 'service'), type('t-nurse', 'infirmière', 'profession')], '');

		expect(items).toEqual([
			{ value: 't-nurse', label: 'infirmière', nature: 'profession' },
			{ value: 't-pharmacy', label: 'pharmacie', nature: 'service' }
		]);
	});

	it('says so when a type’s nature is not known yet', () => {
		expect(getTypeItems([type('t-x', 'x', null)], '')[0].nature).toBeNull();
	});
});
