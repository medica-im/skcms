import { describe, it, expect } from 'vitest';
import { base } from '$app/paths';
import { createEntriesMapData } from './mapData';

/**
 * Where a map marker's popup link points.
 *
 * The address book draws one marker per entry, and its popup carries a link to
 * that entry's page. Entries are addressed by a single unique slug, /e/<slug>,
 * which is what the list beside the map links to.
 *
 * The map used to build its own URL instead, out of the entry's parts:
 * /<type>/<commune>/<person>, or /<facility>/<type>/<person> when the
 * organization is an `msp`. Nothing serves the first shape, so every marker on
 * a non-msp site led to a 404 — the map and the list, side by side on the same
 * page, disagreed about where the same entry lived.
 *
 * This is a lib, so it is not one site's problem: any site that draws a map
 * gets the same links. The rule is simply that if there is a map, its links
 * work.
 */

/** An entry as /api/v2/entries returns it, trimmed to what the map reads. */
const entry = (over: Record<string, unknown> = {}) => ({
	name: 'Paul Bartoli',
	slug: 'paul-bartoli',
	entrySlug: 'paul-bartoli-mg-69',
	effector_type: { name: 'Médecin généraliste', slug: 'medecin-generaliste' },
	commune: { slug: 'lyon' },
	facility: { slug: 'cabinet-de-medecine-generale-duguesclin' },
	address: { latitude: '45.760292', longitude: '4.849019', zoom: 18 },
	...over
});

/** The href out of a marker's popup markup. */
const hrefOf = (popupText: string) => popupText.match(/href="([^"]+)"/)?.[1];

const popupFor = (e: ReturnType<typeof entry>, orgCategory: string | null = null) =>
	hrefOf(createEntriesMapData([e] as never, false, null, orgCategory)[0].popup?.text ?? '');

describe('the address book map links to entries by their unique slug', () => {
	it('points a marker at /e/<entrySlug>', () => {
		expect(popupFor(entry())).toBe(`${base}/e/paul-bartoli-mg-69`);
	});

	// The organization category used to pick between two URL shapes. It has no
	// bearing on where an entry lives, so the same entry gets the same link
	// whoever is asking.
	it.each([['cpts'], ['msp'], [null]])('is the same link for a %s organization', (category) => {
		expect(popupFor(entry(), category as string | null)).toBe(`${base}/e/paul-bartoli-mg-69`);
	});

	// The parts the old scheme was composed from are all still on the entry, so
	// a regression would look plausible rather than obviously broken. Name them.
	it('does not compose a link out of type, commune or facility', () => {
		const href = popupFor(entry(), 'cpts');
		expect(href).not.toContain('medecin-generaliste');
		expect(href).not.toContain('lyon');
		expect(href).not.toContain('cabinet-de-medecine-generale-duguesclin');
	});

	// An entry whose slug never arrived is a data problem, but a link to
	// /e/undefined is a 404 that looks like a routing bug. Leave it out instead.
	it('omits the link rather than pointing at /e/undefined', () => {
		const text =
			createEntriesMapData([entry({ entrySlug: undefined }) as never], false, null, null)[0]
				.popup?.text ?? '';
		expect(text).not.toContain('/e/undefined');
		expect(text).not.toContain('href');
		// The name is still worth showing: a marker with no link is better than
		// no marker, and the tooltip is how you find out which entry it is.
		expect(text).toContain('Paul Bartoli');
	});
});
