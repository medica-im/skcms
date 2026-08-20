import { ORIGIN } from '$lib/utils/origin.ts';
import type { AdminFields } from '$lib/Web/Entries/entriesTable';
import type { PageLoad } from './$types';

// The page renders in the browser only: the table is a sortable, filterable
// view over data the root layout has already fetched, and there is nothing
// here worth server-rendering for a crawler that will never be allowed in.
export const ssr = false;

// The signed-out redirect is in +page.server.ts, which runs before any of
// this is sent to the browser.
export const load: PageLoad = async ({ fetch }) => {
	// /admin/entries carries only what page.data.entries lacks — the creation
	// date, the contact timestamp, the deactivation fields and the names
	// behind the creator/owner uids. The page merges the two by uid.
	//
	// Uncached, unlike /entries: five people hold a role that can read it, so
	// there is no load worth amortising. /entries stays cached for them — that
	// cache is what keeps the rest of the site fast — and is invalidated on
	// every write, so neither payload is ever stale.
	//
	// ORIGIN is empty in the browser, so this is a relative request and the
	// session cookie rides along on its own. Fetching it here rather than in a
	// +page.server.ts also sidesteps the event fetch's same-origin check,
	// which compares against the scheme the Node process sees — http wherever
	// a proxy terminates TLS — and drops a manually set cookie header.
	let adminFields: AdminFields[] | undefined;
	try {
		const response = await fetch(`${ORIGIN}/api/v2/admin/entries`, {
			credentials: 'include',
			method: 'GET',
			headers: { 'content-type': 'application/json' }
		});
		if (!response.ok) {
			// A 403 here is the endpoint working: the page renders its refusal
			// rather than an empty table that looks like an empty directory.
			throw new Error(`Response status: ${response.status}`);
		}
		adminFields = (await response.json()) as AdminFields[];
	} catch (error: any) {
		console.error(`admin entries from +page.ts: ${error.message}`);
	}

	// `adminFields`, not `entries`: page.data merges this route's data over the
	// layout's, so returning `entries` here replaced the layout's public feed
	// with these seven-field rows — and every selector that reads
	// commune, effector_type or facility crashed on undefined.
	return { adminFields };
}
