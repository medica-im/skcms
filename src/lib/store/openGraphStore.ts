import { ORIGIN } from '$lib/utils/origin.ts';
import type { OpenGraph } from '$lib/interfaces/openGraph.interface';

/**
 * The site's sharing card, or undefined. A site without one answers 404, a
 * normal state that is not logged. Pass the load function's fetch.
 */
export const getOpenGraph = async (fetch: typeof globalThis.fetch = globalThis.fetch) => {
	const url = `${ORIGIN}/api/v1/opengraph/`;
	try {
		const response = await fetch(url);
		if (response.status === 404) return undefined;
		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}
		const jsn = await response.json();
		return jsn as OpenGraph
	} catch (error: any) {
		console.error(error.message);
	}
};
