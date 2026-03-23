import { redirect } from '@sveltejs/kit';
import { variables } from '$lib/utils/constants.ts';
import { authReq } from '$lib/utils/request.ts';
import type { Entry, EntryFull } from '$lib/store/directoryStoreInterface';
import type { Cookies } from '@sveltejs/kit';

/**
 * Find an entrySlug from the entries array using old commune-based URL params.
 */
export function findEntrySlugByCommune(
	entries: Entry[],
	type: string,
	commune: string,
	effector: string
): string | null {
	const entry = entries.find(
		(e) =>
			e.effector_type.slug === type &&
			e.commune?.slug === commune &&
			e.slug === effector
	);
	return entry?.entrySlug ?? null;
}

/**
 * Find an entrySlug from the entries array using old facility-based URL params.
 */
export function findEntrySlugByFacility(
	entries: Entry[],
	facility: string,
	type: string,
	effector: string
): string | null {
	const entry = entries.find(
		(e) =>
			e.effector_type.slug === type &&
			(e.facility as any)?.slug === facility &&
			e.slug === effector
	);
	return entry?.entrySlug ?? null;
}

/**
 * Fetch entrySlug from an API endpoint as a fallback when the entry
 * is not found in the entries array (e.g. inactive entries).
 */
async function fetchEntrySlugFromApi(
	cookies: Cookies,
	apiPath: string
): Promise<string | null> {
	const url = `${variables.BASE_URI}${apiPath}`;
	const request = authReq(url, 'GET', cookies);
	const res = await globalThis.fetch(request);
	if (!res.ok) return null;
	const fullentry = (await res.json()) as EntryFull;
	return fullentry.entrySlug ?? null;
}

/**
 * Redirect permanently from an old commune-based (skvar) URL to /e/{entrySlug}.
 * Preserves the query string.
 * Throws a SvelteKit redirect (301) if the entrySlug is found.
 * Returns false if the entrySlug could not be resolved.
 */
export async function redirectToEntrySlugByCommune(
	entries: Entry[] | undefined,
	cookies: Cookies,
	search: string,
	type: string,
	commune: string,
	effector: string
): Promise<false> {
	let entrySlug: string | null = null;
	if (entries) {
		entrySlug = findEntrySlugByCommune(entries, type, commune, effector);
	}
	if (!entrySlug) {
		entrySlug = await fetchEntrySlugFromApi(
			cookies,
			`/api/v2/slugfullentries/${type}/${commune}/${effector}`
		);
	}
	if (entrySlug) {
		redirect(301, `/e/${entrySlug}${search}`);
	}
	return false;
}

/**
 * Redirect permanently from an old facility-based (skvar) URL to /e/{entrySlug}.
 * Preserves the query string.
 * Throws a SvelteKit redirect (301) if the entrySlug is found.
 * Returns false if the entrySlug could not be resolved.
 */
export async function redirectToEntrySlugByFacility(
	entries: Entry[] | undefined,
	cookies: Cookies,
	search: string,
	facility: string,
	type: string,
	effector: string
): Promise<false> {
	let entrySlug: string | null = null;
	if (entries) {
		entrySlug = findEntrySlugByFacility(entries, facility, type, effector);
	}
	if (!entrySlug) {
		entrySlug = await fetchEntrySlugFromApi(
			cookies,
			`/api/v2/ftefullentries/${facility}/${type}/${effector}`
		);
	}
	if (entrySlug) {
		redirect(301, `/e/${entrySlug}${search}`);
	}
	return false;
}
