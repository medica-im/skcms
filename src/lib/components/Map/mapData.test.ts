import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { base } from '$app/paths';
import { createEntriesMapData, createFacilitiesMapData } from './mapData';

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

/**
 * Whether a facility marker's popup links to the facility.
 *
 * createEntriesMapData has always put a link in its popup, because an entry
 * marker is a way in to that person's page. Facility markers were plain text:
 * the popup named the place and stopped there, so a map of facilities was a
 * dead end even though every facility has a page at /sites/<slug>.
 *
 * The link is opt-in via the `anchor` parameter rather than always on, because
 * the two existing uses of this function draw a map *of a single facility on
 * that facility's own page* (Facility.svelte, FacilityPage.svelte) — a popup
 * there would link to the page you are already reading. Default false keeps
 * those callers as they are.
 */

/** A facility as /api/v2/public/facilities returns it, trimmed to what the map reads. */
const facility = (over: Record<string, unknown> = {}) => ({
	uid: 'a4f1c2e',
	name: 'Pôle Santé Gare',
	label: 'Pôle Santé Gare',
	slug: 'pole-sante-gare',
	address: {
		latitude: '43.492949',
		longitude: '-1.463151',
		zoom: 17,
		tooltip_direction: 'top',
		tooltip_text: null
	},
	...over
});

const facilityPopup = (f: ReturnType<typeof facility>, anchor?: boolean) =>
	createFacilitiesMapData([f] as never, false, anchor as never)[0].popup?.text ?? '';

describe('a facility marker links to the facility page only when asked', () => {
	// The default is the behaviour the current callers rely on.
	it('is plain text by default', () => {
		const text = facilityPopup(facility());
		expect(text).toBe('Pôle Santé Gare');
		expect(text).not.toContain('href');
	});

	it('is plain text when anchor is false', () => {
		expect(facilityPopup(facility(), false)).not.toContain('href');
	});

	it('points at /sites/<slug> when anchor is true', () => {
		expect(hrefOf(facilityPopup(facility(), true))).toBe(`${base}/sites/pole-sante-gare`);
	});

	// The label is what the unlinked popup showed, so it stays the link text:
	// turning the anchor on should add a link, not rename the place.
	it('keeps the label as the link text', () => {
		expect(facilityPopup(facility(), true)).toContain('>Pôle Santé Gare</a>');
	});

	it('falls back to the name when there is no label', () => {
		const text = facilityPopup(facility({ label: null }), true);
		expect(text).toContain('>Pôle Santé Gare</a>');
	});

	// Every other /sites/ link in the app is written {base}/sites/{slug||uid},
	// so a facility whose slug never arrived still reaches its page.
	it('addresses a facility with no slug by its uid', () => {
		expect(hrefOf(facilityPopup(facility({ slug: null, uid: 'a4f1c2e' }), true))).toBe(
			`${base}/sites/a4f1c2e`
		);
	});

	// A link to /sites/undefined is a 404 that looks like a routing bug — the
	// same rule createEntriesMapData follows for an entry with no slug.
	it('omits the link rather than pointing at /sites/undefined', () => {
		const text = facilityPopup(facility({ slug: null, uid: null }), true);
		expect(text).not.toContain('/sites/undefined');
		expect(text).not.toContain('/sites/null');
		expect(text).not.toContain('href');
		// The name is still worth showing: a popup with no link beats no popup.
		expect(text).toContain('Pôle Santé Gare');
	});

	// The anchor is about the popup. The tooltip and the geometry are not its
	// business, and `anchor` sits after `tooltip` so it must not disturb it.
	it('leaves the tooltip and the coordinates alone', () => {
		const [linked] = createFacilitiesMapData([facility()] as never, true, true as never);
		const [plain] = createFacilitiesMapData([facility()] as never, true, false as never);
		expect(linked.tooltip).toEqual(plain.tooltip);
		expect(linked.tooltip?.permanent).toBe(true);
		expect(linked.latLng).toEqual(plain.latLng);
		expect(linked.zoom).toEqual(plain.zoom);
	});
});

/**
 * Facility.svelte's mapAnchor prop.
 *
 * The component draws a list of facilities with a map beside it, so its markers
 * should reach the pages the buttons above them reach — it passes anchor=true
 * by default. Read out of the source rather than by mounting the component:
 * the question is which argument reaches createFacilitiesMapData, and mounting
 * would drag in MapLibre, the carousel and page.data to answer it.
 */
describe('Facility.svelte asks for linked markers by default', () => {
	const source = readFileSync(
		new URL('../../Facility/Facility.svelte', import.meta.url),
		'utf-8'
	);

	it('defaults mapAnchor to true', () => {
		expect(source).toMatch(/mapAnchor\s*=\s*true/);
	});

	it('declares mapAnchor as an optional boolean prop', () => {
		expect(source).toMatch(/mapAnchor\?\s*:\s*boolean/);
	});

	// The prop is only worth having if it reaches the popup. A default that
	// never gets passed on would leave every marker unlinked and still pass the
	// test above.
	it('passes it through as the anchor argument', () => {
		expect(source).toMatch(/createFacilitiesMapData\(data,\s*true,\s*mapAnchor\)/);
	});
});
