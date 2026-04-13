import { ORIGIN } from '$lib/utils/origin.ts';
import { error } from '@sveltejs/kit';
import type { Facility } from '$lib/interfaces/facility.interface.ts';
import type { Fetch } from '$lib/interfaces/fetch';

export const fetchFacilities = async (fetch: Fetch, limit: number = 1000): Promise<Facility[]> => {
	const url = `${ORIGIN}/api/v1/facilities/?limit=${limit}`;
	const response = await fetch(url, {
		method: 'GET',
		headers: {
			'Accept': 'application/json',
			'content-type': 'application/json'
		}
	});
	if (!response.ok) {
		console.error(`fetchFacilities ${url} response status: ${response.status}`);
		error(response.status, `Failed to fetch facilities (status ${response.status})`);
	}
	const f: { facilities: Facility[] } = await response.json();
	return f.facilities;
};
