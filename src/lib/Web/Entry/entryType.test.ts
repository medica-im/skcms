import { describe, expect, it, vi } from 'vitest';
import * as m from '$msgs';
import {
	creationPrefill,
	currentSlugFor,
	lockedExplanation,
	recreateEntryHref,
	typeChangeRefusal
} from './entryType';

/**
 * Changing an entry's type gives it a new slug (the slug names the
 * occupation), and the backend keeps the old one: /e/<old slug> must still
 * lead to the entry. The entry page asks where a slug it could not find
 * leads now, and redirects there.
 */
describe('currentSlugFor', () => {
	const answering = (status: number, body?: unknown) =>
		vi.fn(async () => new Response(body ? JSON.stringify(body) : null, { status }));

	it('gives the slug a former slug leads to', async () => {
		const fetchFn = answering(200, { uid: 'u1', slug: 'dupont-jean-ipa-69' });

		expect(await currentSlugFor('https://api.example.org', 'dupont-jean-mg-69', fetchFn)).toBe(
			'dupont-jean-ipa-69'
		);
		expect(fetchFn).toHaveBeenCalledWith('https://api.example.org/api/v2/entry-slugs/dupont-jean-mg-69');
	});

	it('gives nothing for a slug that was never an entry’s', async () => {
		expect(await currentSlugFor('https://api.example.org', 'nobody-69', answering(404))).toBeNull();
	});

	it('gives nothing when the answer is the same slug, so a page cannot redirect to itself', async () => {
		const fetchFn = answering(200, { uid: 'u1', slug: 'dupont-jean-mg-69' });

		expect(await currentSlugFor('https://api.example.org', 'dupont-jean-mg-69', fetchFn)).toBeNull();
	});

	it('gives nothing when the lookup itself fails', async () => {
		const failing = vi.fn(async () => {
			throw new Error('network');
		});

		expect(await currentSlugFor('https://api.example.org', 'x', failing)).toBeNull();
	});

	it('escapes the slug in the path', async () => {
		const fetchFn = answering(404);

		await currentSlugFor('https://api.example.org', 'a/b c', fetchFn);

		expect(fetchFn).toHaveBeenCalledWith('https://api.example.org/api/v2/entry-slugs/a%2Fb%20c');
	});
});

/**
 * Past the window, the page offers to recreate the entry instead: the
 * creation page opened with the same place and person already chosen.
 */
describe('recreateEntryHref', () => {
	it('opens the creation page with the place and the person', () => {
		expect(recreateEntryHref('/annuaire', 'f1', 'p1')).toBe('/annuaire/web/entry?facility=f1&effector=p1');
	});

	it('works at the root of a site', () => {
		expect(recreateEntryHref('', 'f1', 'p1')).toBe('/web/entry?facility=f1&effector=p1');
	});
});

/**
 * The backend refuses with codes; each is worded here, and an unexpected
 * code still says something.
 */
describe('typeChangeRefusal', () => {
	it.each([
		['same_type', m.ENTRY_TYPE_EDIT_ERROR_SAME_TYPE()],
		['duplicate', m.ENTRY_TYPE_EDIT_ERROR_DUPLICATE()],
		['malformed', m.ENTRY_TYPE_EDIT_ERROR_MALFORMED()],
		['unknown_type', m.ENTRY_TYPE_EDIT_ERROR_UNKNOWN_TYPE()],
		['type_not_offered', m.ENTRY_TYPE_NOT_OFFERED()],
		['not_allowed', m.ENTRY_TYPE_EDIT_LOCKED()],
		[undefined, m.ENTRY_TYPE_EDIT_ERROR_FAILED()],
		['something_new', m.ENTRY_TYPE_EDIT_ERROR_FAILED()]
	])('words %s', (code, words) => {
		expect(typeChangeRefusal(code)).toBe(words);
	});

	it('words an expired window with its length', () => {
		expect(typeChangeRefusal('expired', 30)).toBe(m.ENTRY_TYPE_EDIT_EXPIRED({ days: 30 }));
	});
});

describe('lockedExplanation', () => {
	it('says how many days the organization allows', () => {
		expect(lockedExplanation({ reason: 'expired', window_days: 7 })).toContain('7 jours');
	});

	it('says when the creation date is unknown', () => {
		expect(lockedExplanation({ reason: 'no_date', window_days: 30 })).toBe(m.ENTRY_TYPE_EDIT_NO_DATE());
	});
});

/**
 * The creation page can open with a place and a person already chosen
 * (?facility=&effector=), the way an entry past its window is replaced.
 * Whatever cannot be found is left for the user to choose.
 */
describe('creationPrefill', () => {
	const api = 'https://api.example.org/api/v2';
	const answers: Record<string, unknown> = {
		[`${api}/facilities/f1`]: { uid: 'f1', label: 'Cabinet du centre', name: 'cabinet-du-centre' },
		[`${api}/effectors/p1`]: { uid: 'p1', name_fr: 'Jean Dupont' }
	};
	const fetchFn = vi.fn(async (url: string) =>
		url in answers ? new Response(JSON.stringify(answers[url])) : new Response(null, { status: 404 })
	);

	it('gives the facility as a choice and the person as they are', async () => {
		const prefill = await creationPrefill(api, new URLSearchParams('facility=f1&effector=p1'), fetchFn);

		expect(prefill.facility).toEqual({ label: 'Cabinet du centre', value: 'f1' });
		expect(prefill.effector).toEqual({ uid: 'p1', name_fr: 'Jean Dupont' });
	});

	it('leaves out what is not found', async () => {
		const prefill = await creationPrefill(api, new URLSearchParams('facility=nope&effector=p1'), fetchFn);

		expect(prefill.facility).toBeUndefined();
		expect(prefill.effector?.uid).toBe('p1');
	});

	it('asks nothing when the address carries nothing', async () => {
		fetchFn.mockClear();

		expect(await creationPrefill(api, new URLSearchParams(''), fetchFn)).toEqual({});
		expect(fetchFn).not.toHaveBeenCalled();
	});
});
