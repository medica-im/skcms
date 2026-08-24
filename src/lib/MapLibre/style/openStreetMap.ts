import type { StyleSpecification } from 'maplibre-gl';

/**
 * The OpenStreetMap raster style, as a typed module rather than a JSON import.
 *
 * TypeScript widens literals when it types a `.json` file: `"version": 8`
 * becomes `number` and `"type": "raster"` becomes `string`, neither of which
 * satisfies StyleSpecification's `8` and `"raster"`. Importing the JSON
 * therefore could not be passed to <MapLibre style={...}> without a cast that
 * silenced any real mistake in the file along with the spurious error.
 *
 * `satisfies` keeps the literal types and still checks the whole object against
 * the spec, so a typo here is caught at build time.
 */
export const openStreetMap = {
	version: 8,
	metadata: {},
	sources: {
		osm: {
			type: 'raster',
			tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
			tileSize: 256,
			attribution: '&copy; OpenStreetMap Contributors',
			maxzoom: 19
		}
	},
	layers: [
		{
			id: 'osm',
			type: 'raster',
			source: 'osm'
		}
	]
} satisfies StyleSpecification;

export default openStreetMap;
