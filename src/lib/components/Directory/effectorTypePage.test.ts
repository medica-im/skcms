import { describe, it, expect } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { effectorTypePage } from './effectorTypePage';
import type { Entry } from '$lib/store/directoryStoreInterface';
import type { Labels } from '$lib/interfaces/label.interace';

const ORG = 'org-msp';
const GP = { uid: 'type-mg', slug: 'medecin-generaliste', name: 'médecin généraliste' };
const NURSE = { uid: 'type-ide', slug: 'infirmiere', name: 'infirmière' };

const entry = (uid: string, type: typeof GP, memberships: string[], gender = 'F') =>
	({ uid, effector_type: type, memberships, gender }) as unknown as Entry;

const entries = [
	entry('e1', GP, [ORG]),
	entry('e2', GP, [ORG], 'M'),
	entry('e3', GP, ['another-org']),
	entry('e4', NURSE, ['another-org'])
];

const labels = {
	'type-mg': {
		S: { F: 'médecin généraliste', M: 'médecin généraliste', N: 'médecin généraliste' },
		P: { F: 'médecins généralistes', M: 'médecins généralistes', N: 'médecins généralistes' }
	}
} as unknown as Labels;

const context = { organization: { uid: ORG }, entries, labels };

function statusOf(run: () => unknown): number | undefined {
	try {
		run();
	} catch (e) {
		if (isHttpError(e)) return e.status;
		throw e;
	}
}

describe('effectorTypePage', () => {
	it('answers 404 for a slug that is no effector type, such as a person\'s name', () => {
		expect(statusOf(() => effectorTypePage('alexis-bernal', context))).toBe(404);
	});

	it('answers 404 for a type none of the organization\'s members has', () => {
		expect(statusOf(() => effectorTypePage('infirmiere', context))).toBe(404);
	});

	it("lists the organization's own members of that type", () => {
		const page = effectorTypePage('medecin-generaliste', context);
		expect(page.entries?.map((e) => e.uid)).toEqual(['e1', 'e2']);
		expect(page.types).toEqual(['type-mg']);
		expect(page.slug).toBe('medecin-generaliste');
	});

	it('labels the list in the number its members call for', () => {
		expect(effectorTypePage('medecin-generaliste', context).label).toBe('médecins généralistes');
	});
});
