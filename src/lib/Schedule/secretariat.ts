import { establishments } from '#lib/components/Directory/sites.ts';
import { fetchFacilities } from '#lib/Facility/facility.ts';
import { fetchSchedules, type ApiSchedule } from './scheduleApi.ts';
import type { Facility } from '#lib/interfaces/facility.interface.ts';
import type { Entry } from '#lib/store/directoryStoreInterface.ts';

export type Secretariat = {
	facility: Facility;
	entry: Entry;
	phone: ApiSchedule | undefined;
	onSite: ApiSchedule | undefined;
	schedules: ApiSchedule[];
};

/**
 * The secretariat of the organization's main establishment, with its hours: the first place of
 * `establishments` that has one. A page that needs the hours reads them here and shows them where
 * they are, never keeping a copy.
 */
export const loadSecretariat = async (
	fetch: typeof globalThis.fetch,
	entries: Entry[],
	orgUid: string
): Promise<Secretariat | undefined> => {
	let facilities: Facility[];
	try {
		facilities = await fetchFacilities(fetch);
	} catch (err) {
		console.error('secretariat: facilities unavailable', err);
		return undefined;
	}
	const place = establishments(facilities, entries, orgUid).find((p) => p.secretariat);
	if (!place?.secretariat) return undefined;
	const schedules = await fetchSchedules(fetch, place.secretariat.uid);
	return {
		facility: place.facility,
		entry: place.secretariat,
		phone: schedules.find((s) => s.channel === 'phone'),
		onSite: schedules.find((s) => s.channel === 'on_site'),
		schedules
	};
};
