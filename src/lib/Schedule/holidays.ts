import metropole from '$lib/assets/json/metropole.json';
import type { PublicHolidays } from './schedule.interface.ts';

type FetchFn = (url: string) => Promise<Response>;

const TIME_ZONES: Record<string, string> = {
	guadeloupe: 'America/Guadeloupe',
	martinique: 'America/Martinique',
	guyane: 'America/Cayenne',
	'la-reunion': 'Indian/Reunion',
	mayotte: 'Indian/Mayotte',
	'saint-barthelemy': 'America/St_Barthelemy',
	'saint-martin': 'America/Marigot',
	'saint-pierre-et-miquelon': 'America/Miquelon',
	'nouvelle-caledonie': 'Pacific/Noumea',
	'polynesie-francaise': 'Pacific/Tahiti',
	'wallis-et-futuna': 'Pacific/Wallis'
};

const BUNDLED: Record<string, PublicHolidays> = {
	metropole: metropole,
	'alsace-moselle': metropole
};

const pending = new Map<string, Promise<PublicHolidays>>();

export const timeZoneOf = (zone: string): string => TIME_ZONES[zone] ?? 'Europe/Paris';

export const resetHolidaysCache = () => pending.clear();

const fetchZone = async (zone: string, fetchFn: FetchFn): Promise<PublicHolidays> => {
	try {
		const response = await fetchFn(`https://calendrier.api.gouv.fr/jours-feries/${zone}.json`);
		if (response.ok) return (await response.json()) as PublicHolidays;
		console.error(`holidays: ${zone} answered ${response.status}`);
	} catch (error) {
		console.error('holidays: request failed', error);
	}
	throw new Error(`holidays unavailable for ${zone}`);
};

export const holidaysFor = (zone: string, fetchFn: FetchFn = fetch): Promise<PublicHolidays> => {
	const known = pending.get(zone);
	if (known) return known;
	const request = fetchZone(zone, fetchFn).catch(() => {
		pending.delete(zone);
		return BUNDLED[zone] ?? {};
	});
	pending.set(zone, request);
	return request;
};
