import { redirect } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { AdminEntry } from '$lib/Web/Entries/entriesTable';
import type { PageServerLoad } from './$types';

// Server-side only. The payload names who created and owns every entry in the
// directory, so it is fetched with the caller's cookie and never handed to a
// client load that would refetch it from the browser.
export const ssr = false;

export const load: PageServerLoad = async ({ url, cookies, locals, fetch }) => {
	const session = await locals.auth();
	if (!session) {
		redirect(303, `/signin?redirect=${url.pathname}`);
	}

	// /admin/entries, not /entries: a separate endpoint restricted to
	// administrators and superusers, uncached, carrying the creator, owner and
	// deactivation fields the public feed deliberately does not have.
	let entries: AdminEntry[] | undefined;
	const endpoint = `${variables.BASE_URI}/api/v2/admin/entries`;
	try {
		const response = await fetch(authReq(endpoint, 'GET', cookies));
		if (!response.ok) {
			// A 403 here is the endpoint working: the page renders its refusal
			// rather than an empty table that looks like an empty directory.
			throw new Error(`Response status: ${response.status}`);
		}
		entries = (await response.json()) as AdminEntry[];
	} catch (error: any) {
		console.error(`admin entries from +page.server.ts: ${error.message}`);
	}

	return { session, entries };
};
