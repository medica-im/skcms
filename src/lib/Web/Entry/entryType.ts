import * as m from '$msgs';

/**
 * Changing an entry's effector type (backend api/routers/entry_type.py).
 *
 * The type is part of what an entry is -- (person, occupation, place) -- and
 * of its slug, so a change gives the entry a new slug; the old one keeps
 * leading to it through /api/v2/entry-slugs. Past the organization's time
 * window the change is refused, and the page offers to recreate the entry
 * with the same place and person instead.
 */

export interface TypeEditPermission {
	allowed: boolean;
	/** not_allowed: no right at all; expired: the window has passed; no_date: no creation date. */
	reason: 'not_allowed' | 'expired' | 'no_date' | null;
	/** The window that applies, in days (the organization's setting); null for a superuser. */
	window_days: number | null;
	deadline: string | null;
	created_at: number | null;
}

type FetchLike = (input: string) => Promise<Response>;

/** The slug a former slug leads to now, or null (never an entry's, gone, or unchanged). */
export async function currentSlugFor(
	apiBase: string,
	slug: string,
	fetchFn: FetchLike
): Promise<string | null> {
	try {
		const response = await fetchFn(`${apiBase}/api/v2/entry-slugs/${encodeURIComponent(slug)}`);
		if (!response.ok) return null;
		const current = (await response.json())?.slug;
		return typeof current === 'string' && current && current !== slug ? current : null;
	} catch {
		return null;
	}
}

/** The creation page with this place and person already chosen. */
export const recreateEntryHref = (base: string, facilityUid: string, effectorUid: string) =>
	`${base}/web/entry?facility=${encodeURIComponent(facilityUid)}&effector=${encodeURIComponent(effectorUid)}`;

/** Why the change cannot be made any more, in the organization's terms. */
export function lockedExplanation(permission: Pick<TypeEditPermission, 'reason' | 'window_days'>): string {
	if (permission.reason === 'no_date') return m.ENTRY_TYPE_EDIT_NO_DATE();
	return m.ENTRY_TYPE_EDIT_EXPIRED({ days: permission.window_days ?? 0 });
}

/** A refusal code from the backend, worded. */
export function typeChangeRefusal(code: string | undefined, windowDays: number | null = null): string {
	switch (code) {
		case 'same_type':
			return m.ENTRY_TYPE_EDIT_ERROR_SAME_TYPE();
		case 'duplicate':
			return m.ENTRY_TYPE_EDIT_ERROR_DUPLICATE();
		case 'malformed':
			return m.ENTRY_TYPE_EDIT_ERROR_MALFORMED();
		case 'unknown_type':
			return m.ENTRY_TYPE_EDIT_ERROR_UNKNOWN_TYPE();
		case 'type_not_offered':
			return m.ENTRY_TYPE_NOT_OFFERED();
		case 'expired':
			return m.ENTRY_TYPE_EDIT_EXPIRED({ days: windowDays ?? 0 });
		case 'no_date':
			return m.ENTRY_TYPE_EDIT_NO_DATE();
		case 'not_allowed':
			return m.ENTRY_TYPE_EDIT_LOCKED();
		default:
			return m.ENTRY_TYPE_EDIT_ERROR_FAILED();
	}
}

/**
 * The place and the person the creation page opens with (?facility=&effector=),
 * each fetched as the signed-in user; whatever is missing or not found is
 * simply not preset. `facility` is a picker choice; `effector` the person as
 * the creation steps use it.
 */
export async function creationPrefill<E = { uid: string }>(
	apiBase: string,
	params: URLSearchParams,
	fetchFn: FetchLike
): Promise<{ facility?: { label: string; value: string }; effector?: E }> {
	const get = async (path: string) => {
		try {
			const response = await fetchFn(`${apiBase}${path}`);
			return response.ok ? await response.json() : undefined;
		} catch {
			return undefined;
		}
	};
	const facilityUid = params.get('facility');
	const effectorUid = params.get('effector');
	const [facility, effector] = await Promise.all([
		facilityUid ? get(`/facilities/${encodeURIComponent(facilityUid)}`) : undefined,
		effectorUid ? get(`/effectors/${encodeURIComponent(effectorUid)}`) : undefined
	]);
	const prefill: { facility?: { label: string; value: string }; effector?: E } = {};
	if (facility?.uid) prefill.facility = { label: facility.label || facility.name || facility.uid, value: facility.uid };
	if (effector?.uid) prefill.effector = effector as E;
	return prefill;
}
