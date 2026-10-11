const BAN_SEARCH = 'https://api-adresse.data.gouv.fr/search/';

interface Municipality {
	geometry: { coordinates: [number, number] };
	properties: { context?: string };
}

/**
 * A commune's centre as [lat, lng], from the same address API the geocoder uses.
 *
 * Commune names repeat across France, so the department code, when known,
 * picks the right one; BAN's `context` starts with it ("84, Vaucluse, …").
 */
export const communeCentre = async (
	commune: string,
	departmentCode: string | null,
	fetcher: (url: string) => Promise<Response> = fetch
): Promise<[number, number] | null> => {
	const url = new URL(BAN_SEARCH);
	url.searchParams.set('q', commune);
	url.searchParams.set('type', 'municipality');
	url.searchParams.set('limit', '10');
	try {
		const response = await fetcher(url.toString());
		if (!response.ok) return null;
		const { features = [] }: { features?: Municipality[] } = await response.json();
		const match = departmentCode
			? features.find((f) => f.properties.context?.startsWith(`${departmentCode},`))
			: features[0];
		if (!match) return null;
		const [lng, lat] = match.geometry.coordinates;
		return [lat, lng];
	} catch {
		return null;
	}
};
