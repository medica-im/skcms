import { ORIGIN } from '$lib/utils/origin.ts';
import type { OpenGraph } from '$lib/interfaces/openGraph.interface';

export const getOpenGraph = async () => {
	const url = `${ORIGIN}/api/v1/opengraph/`;
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}
		const jsn = await response.json();
		return jsn as OpenGraph
	} catch (error: any) {
		console.error(error.message);
	}
};