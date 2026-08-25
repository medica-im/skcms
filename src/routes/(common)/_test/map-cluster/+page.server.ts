import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Facility } from '$lib/interfaces/facility.interface.ts';
import fixture from './facilities.fixture.json';

/**
 * The Lyon 3 directory, checked in rather than fetched.
 *
 * This page compares two map components on a *crowded* directory: sixteen
 * facilities inside 1.8 x 4 km, six pairs under 100 m apart, and two sharing a
 * coordinate exactly. That crowding is the subject — it is what makes a cluster
 * form, what picking a facility has to resolve, and what the scenarios in
 * features/map-hover-highlight.feature observe.
 *
 * It used to fetch its own origin. Under Playwright the page is served by a
 * per-worker site (w0.dev.medica.im ...), whose seeded directory is six
 * facilities scattered from Le Portel to Avignon. Their bounding box spans most
 * of France, so the map fits to that and almost nothing lands in the viewport.
 * Nothing errors; there is simply no crowded map left to test.
 *
 * Two fixes were rejected before this one:
 *
 *   - Reshaping the worker seed to Lyon. That dataset is shared with features
 *     that name its facilities outright — facility-rename.feature renames
 *     "Pharmacie des Félibres" — so moving it would break passing scenarios to
 *     serve this page.
 *   - Fetching dev.santelyon3.fr directly. A test that reaches a live site
 *     fails when that site is down and changes meaning when its data changes.
 *
 * A fixture is neither: the crowding is pinned, the page renders offline, and
 * the scenarios assert against a dataset that cannot move under them.
 *
 * The earlier literal version of this page went stale because slugs were
 * renamed underneath it (dedupe_facility_slugs). Refresh with:
 *
 *     curl -s https://dev.santelyon3.fr/api/v2/public/facilities \
 *       | python3 -c 'import json,sys; d=json.load(sys.stdin); \
 *         d.sort(key=lambda f:(f.get("name") or "", f.get("uid") or "")); \
 *         print(json.dumps(d, ensure_ascii=False, indent="\t"))' \
 *       > src/routes/'(common)'/_test/map-cluster/facilities.fixture.json
 *
 * Sorted on write so a refresh yields a reviewable diff rather than a reshuffle.
 * The payload is the public endpoint's, which carries no phones, emails or
 * avatars — names and street addresses only.
 */
const facilities = fixture as unknown as Facility[];

export const load: PageServerLoad = async () => {
	if (!dev) error(404, 'Not found');
	return { facilities };
};
