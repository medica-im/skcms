type Coordinate = number | string | null | undefined;

const toNumber = (value: Coordinate): number =>
	value === null || value === undefined || value === '' ? Number.NaN : Number(value);

/**
 * Whether a latitude/longitude pair is a position worth putting on a map.
 *
 * 0/0 counts as no position: it is what the facility forms used to save when
 * nobody placed the facility.
 */
export const hasCoordinates = (lat: Coordinate, lng: Coordinate): boolean => {
	const y = toNumber(lat);
	const x = toNumber(lng);
	if (!Number.isFinite(y) || !Number.isFinite(x)) return false;
	if (Math.abs(y) > 90 || Math.abs(x) > 180) return false;
	return !(y === 0 && x === 0);
};

const EARTH_RADIUS_KM = 6371;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance between two [lat, lng] points. */
export const distanceKm = (a: [number, number], b: [number, number]): number => {
	const dLat = radians(b[0] - a[0]);
	const dLng = radians(b[1] - a[1]);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(radians(a[0])) * Math.cos(radians(b[0])) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};
