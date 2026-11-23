import { facilityEntries, findSecretariat } from '#lib/components/Directory/sites.ts';
import { fetchSchedules } from '#lib/Schedule/scheduleApi.ts';
import type { PageLoad } from './$types';

/**
 * The facility and `canEdit` come from the server load: the latter needs the
 * session cookie, which only the server can read.
 *
 * What stays here is `entryMap`, and deliberately so. It is built from the
 * layout's `entries`, which the universal layout re-fetches in the browser and
 * only falls back to the server's copy — reading them through a server load
 * would see the server copy alone, which comes back empty on staging.
 */
export const load: PageLoad = async ({ data, parent, fetch }) => {
	const { entries, labels } = await parent();
	if (entries === undefined) throw new Error('entries undefined');
	if (labels === undefined) throw new Error('labels undefined');
	const secretariat = findSecretariat(entries, data.facility?.uid);
	return {
		...data,
		entryMap: facilityEntries(entries, data.facility?.uid, labels),
		secretariat,
		secretariatSchedules: secretariat ? await fetchSchedules(fetch, secretariat.uid) : []
	};
};
