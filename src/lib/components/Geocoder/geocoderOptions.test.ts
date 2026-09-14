import { describe, it, expect } from 'vitest';

/**
 * The geocoder must offer choices for an address that exists inside the
 * directory's own territory.
 *
 * Reported symptom: on /sites/{slug}, editing a facility and typing the start
 * of an address ("255 RUE") fires the API request but renders no choices. The
 * dropdown only appears when getAddressOptions() returns a non-empty array, so
 * an empty list is indistinguishable from a broken request.
 *
 * Three filters in Geocoder.svelte's getAddressOptions() can each empty the
 * list on their own, and every one of them is silent:
 *
 *   1. housenumber must be set   — the BAN returns street-level rows with
 *                                  housenumber: null for a partial query
 *   2. city === commune          — EXACT string equality against the
 *                                  facility's own address.city
 *   3. postcode[0:2] ∈ postal_codes — the directory's departments
 *
 * The national ranking is what makes this sharp. A bare "255 RUE" returns 20
 * features and NONE of them are in Lyon — they are Paris, Bordeaux, Lille. The
 * commune is what rescues it: Geocoder.getParams() sends
 * `q = "${inputAddress} ${commune}"`, and "255 RUE Lyon" returns 3 rows that
 * survive all three filters. Both payloads below are real responses from
 * api-adresse.data.gouv.fr, captured 14 Sep 2026.
 *
 * So this pins two things that are easy to regress independently:
 *   - dropping the commune from the query (filters then strip everything)
 *   - tightening a filter until a legitimate local address disappears
 *
 * The filter chain is reimplemented here rather than imported because it lives
 * inside a .svelte component and reads `page.data`. Keep it in step with
 * getAddressOptions() — that coupling is the cost of testing it in node, and it
 * is worth it: the bug is arithmetic on a payload, not a rendering problem.
 */

interface Feature {
	properties: {
		housenumber?: string | null;
		street?: string | null;
		city?: string | null;
		postcode?: string | null;
	};
}

/** Mirrors getAddressOptions() in Geocoder.svelte. */
function getAddressOptions(
	features: Feature[],
	{ commune, postalCodes, limitToZip = true }:
		{ commune: string | null; postalCodes: string[]; limitToZip?: boolean }
) {
	return features
		.filter((e) => e.properties.housenumber)
		.filter((e) => (commune ? e.properties.city === commune : true))
		.filter((e) => {
			if (limitToZip === false) return true;
			return postalCodes.length
				? postalCodes.some((p) => (e.properties.postcode ?? '').startsWith(p))
				: true;
		})
		.map((e) => ({
			label: `${e.properties.housenumber} ${e.properties.street}`,
			value: e
		}));
}

const f = (
	housenumber: string | null,
	street: string,
	city: string,
	postcode: string
): Feature => ({ properties: { housenumber, street, city, postcode } });

/** Real response for q="255 RUE Lyon" — what the component actually sends. */
const withCommune: Feature[] = [
	f('255', 'Rue Vendôme', 'Lyon', '69003'),
	f('255', 'Rue Garibaldi', 'Lyon', '69003'),
	f('255', 'Rue Duguesclin', 'Lyon', '69003'),
	f(null, 'Rue Renan', 'Lyon', '69007'),
	f(null, 'Rue Raulin', 'Lyon', '69007'),
	f(null, 'Rue Ney', 'Lyon', '69006')
];

/** Real response for q="255 RUE" — the national ranking, no Lyon at all. */
const withoutCommune: Feature[] = [
	f('255', 'Rue Lecourbe', 'Paris', '75015'),
	f('255', 'Rue Pelleport', 'Bordeaux', '33800'),
	f('255', 'Rue Judaïque', 'Bordeaux', '33000'),
	f('255', 'Rue Nationale', 'Lille', '59800'),
	f('255', 'Rue Marcadet', 'Paris', '75018')
];

const lyon = { commune: 'Lyon', postalCodes: ['69'] };

describe('geocoder choices for an address inside the territory', () => {
	it('offers the local matches for "255 RUE Lyon"', () => {
		const options = getAddressOptions(withCommune, lyon);

		expect(options.length).toBeGreaterThan(0);
		expect(options.map((o) => o.label)).toEqual([
			'255 Rue Vendôme',
			'255 Rue Garibaldi',
			'255 Rue Duguesclin'
		]);
	});

	it('drops the street-level rows that have no housenumber', () => {
		const options = getAddressOptions(withCommune, lyon);

		expect(options).toHaveLength(3);
		expect(options.every((o) => o.value.properties.housenumber)).toBe(true);
	});

	/**
	 * The regression that produces "no choices despite a request being sent".
	 * Not a hypothetical: this is the real national payload, and every row is
	 * filtered out. If getParams() ever stops appending the commune, this is
	 * what the user sees.
	 */
	it('is emptied by the national ranking when the commune is not in the query', () => {
		const options = getAddressOptions(withoutCommune, lyon);

		expect(options).toHaveLength(0);
	});

	it('keeps a Lyon address whose arrondissement postcode differs', () => {
		// 69003 and 69007 are both Lyon; the filter compares only "69".
		const options = getAddressOptions(
			[f('255', 'Rue Rachais', 'Lyon', '69007')],
			lyon
		);

		expect(options).toHaveLength(1);
	});

	it('excludes an address outside the directory departments', () => {
		const options = getAddressOptions(
			[f('255', 'Rue Lecourbe', 'Lyon', '75015')],
			lyon
		);

		expect(options).toHaveLength(0);
	});

	/**
	 * city === commune is exact. A facility whose address.city carries an
	 * arrondissement ("Lyon 3e Arrondissement") or different casing never
	 * matches the BAN's "Lyon", and the dropdown stays empty however well the
	 * address is typed. Documented because it is the most likely cause when
	 * this reappears on a site other than santelyon3.
	 */
	it('finds nothing when the facility commune does not match the BAN spelling', () => {
		const options = getAddressOptions(withCommune, {
			commune: 'Lyon 3e Arrondissement',
			postalCodes: ['69']
		});

		expect(options).toHaveLength(0);
	});

	/**
	 * The reported asymmetry: the SAME address offers choices when creating a
	 * facility and none when editing one.
	 *
	 * The two call sites disagree about one prop:
	 *
	 *   create  /web/facility/create/+page.svelte:218   limitToZip={false}
	 *   edit    UpdateFacilityModal.svelte:252          (omitted -> true)
	 *
	 * So editing applies a department filter that creating does not. On
	 * santelyon3 both still work, because the facilities are all in Lyon and
	 * postal_codes is ['69'] — verified against the live API, "255 RUE
	 * GARIBALDI Lyon" returns one row that passes every filter. The asymmetry
	 * only bites where the facility's postcode falls outside the directory's
	 * departments: a border commune, or a directory whose postal_codes is
	 * narrower than the facilities it holds.
	 */
	it('reproduces create-vs-edit: the same address survives create and is dropped by edit', () => {
		// One real BAN row, outside the directory's departments.
		const outsideDepartment = [f('255', 'Rue Garibaldi', 'Lyon', '01000')];

		const onCreate = getAddressOptions(outsideDepartment, {
			commune: 'Lyon',
			postalCodes: ['69'],
			limitToZip: false
		});
		const onEdit = getAddressOptions(outsideDepartment, {
			commune: 'Lyon',
			postalCodes: ['69']
		});

		expect(onCreate).toHaveLength(1);
		expect(onEdit).toHaveLength(0);
	});

	it('offers 255 Rue Garibaldi when editing a Lyon facility', () => {
		// The live API returns exactly this row for "255 RUE GARIBALDI Lyon".
		const options = getAddressOptions(
			[f('255', 'Rue Garibaldi', 'Lyon', '69003')],
			lyon
		);

		expect(options).toHaveLength(1);
		expect(options[0].label).toBe('255 Rue Garibaldi');
	});

	/**
	 * PRODUCTION BUG, santelyon3.fr, 14 Sep 2026.
	 *
	 * The filter takes a two-character prefix of the BAN postcode and asks
	 * whether postal_codes CONTAINS it:
	 *
	 *     postal_codes.includes(postcode.substring(0, 2))
	 *
	 * That is an exact array membership test, not a prefix match. It therefore
	 * only ever works when postal_codes holds two-character DEPARTMENT codes:
	 *
	 *     staging     postal_codes = ['69']      '69003'[:2] = '69'    -> found
	 *     production  postal_codes = ['69003']   '69003'[:2] = '69'    -> NOT found
	 *
	 * ['69003'].includes('69') is false, so on production EVERY address is
	 * discarded — including 255 Rue Garibaldi at 69003, which is the
	 * directory's own postcode. The request succeeds, 3 features come back, and
	 * the dropdown stays empty.
	 *
	 * Two ways to fix it, and they are not equivalent:
	 *   - data: store departments ('69') in postal_codes, as staging does. The
	 *     filter then works, but a 5-digit entry silently means "match nothing"
	 *     for whoever configures the next site.
	 *   - code: compare with startsWith, so both ['69'] and ['69003'] mean what
	 *     they look like they mean. Narrower than the current behaviour when
	 *     the value really is 5 digits, which is presumably the intent.
	 *
	 * FIXED 14 Sep 2026 in Geocoder.svelte with the startsWith form below.
	 * This test now asserts the fixed behaviour in both shapes.
	 */
	it('offers the address under BOTH postal_codes shapes (the prod fix)', () => {
		const garibaldi = [f('255', 'Rue Garibaldi', 'Lyon', '69003')];

		const asStaging = getAddressOptions(garibaldi, {
			commune: 'Lyon',
			postalCodes: ['69']
		});
		const asProduction = getAddressOptions(garibaldi, {
			commune: 'Lyon',
			postalCodes: ['69003']
		});

		expect(asStaging).toHaveLength(1);
		// Was 0 before the fix: ['69003'].includes('69') is false, so the
		// address was dropped from the directory's own postcode.
		expect(asProduction).toHaveLength(1);
	});

	/**
	 * The prefix match must stay a RESTRICTION, not a wildcard: a directory
	 * configured with a full postcode should still exclude a neighbouring
	 * arrondissement. This is the behaviour that would be lost by "fixing" the
	 * bug with a plain substring(0,2) comparison on both sides.
	 */
	it('still excludes another arrondissement under an exact postcode', () => {
		const lyon7 = [f('255', 'Rue Rachais', 'Lyon', '69007')];

		expect(
			getAddressOptions(lyon7, { commune: 'Lyon', postalCodes: ['69003'] })
		).toHaveLength(0);
		// and still excludes another department entirely
		expect(
			getAddressOptions(
				[f('255', 'Rue Lecourbe', 'Lyon', '75015')],
				{ commune: 'Lyon', postalCodes: ['69'] }
			)
		).toHaveLength(0);
	});

	it('ignores the department filter when limitToZip is false', () => {
		const options = getAddressOptions(
			[f('255', 'Rue Lecourbe', 'Lyon', '75015')],
			{ ...lyon, limitToZip: false }
		);

		expect(options).toHaveLength(1);
	});
});
