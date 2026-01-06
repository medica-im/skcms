import { getLocalStorage } from '$lib/utils/storage';
import type { Facility } from '$lib/interfaces/facility.interface.ts';
import { variables } from '$lib/utils/constants';
import { asyncReadable, asyncDerived } from '@square/svelte-store';
import { browser } from "$app/environment";
import { shuffle } from '$lib/helpers/random';
import { downloadElements } from '$lib/store/directoryStore.ts';
import { doRefresh } from '$lib/utils/utils.ts';
import type { Organization } from '$lib/interfaces/organization.ts';
import type { Fetch } from '$lib/interfaces/fetch';

export const organizationStore = asyncReadable(
	{},
	async () => {
		var cachelife = 600;
		const cacheName = "organization";
		let cachedData;
		let expired = true;
		let empty: boolean = true;
		let lang = variables.DEFAULT_LANGUAGE;
		if (browser) {
			cachedData = localStorage.getItem(`${cacheName}`);
		}
		if (cachedData) {
			cachedData = JSON.parse(cachedData);
			expired = Date.now() - cachedData.cachetime > cachelife * 1000;
			if ('data' in cachedData) {
				if (cachedData.data) {
					empty = false;
				}
			}
		}
		if (cachedData && !expired && cachedData.data) {
			return cachedData.data;
		} else {
			const url = `${variables.BASE_URI}/api/v2/organization`;
			const response = await fetch(url);
			if (response.ok) {
				const data: Organization = await response.json();
				if (browser) {
					var json = { data: data, cachetime: Date.now() }
					localStorage.setItem(`${cacheName}`, JSON.stringify(json));
				}
				return data;
			} else {
				throw new Error(`fetch ${url} ${response.status}`);
			}
		}
	}
);


export const getFacilities = async (skFetch: Fetch | null = null): Promise<Facility[]> => {
	const cacheName = "facilities";
	let cachedData;
	if (browser) {
		cachedData = getLocalStorage(`${cacheName}`);
	}
	const refresh: boolean = await doRefresh("v1:entries", cachedData?.cachetime);
	if (refresh) {
		const facilities: Facility[] = await downloadElements("facilities");
		if (facilities.length) {
			facilities.sort((a, b) => {
				if (!a.name && !b.name) return 0
				else if (!a.name && b.name) return 1
				else if (a.name && !b.name) return -1
				else return a.name.localeCompare(b.name);
			})
			if (browser) {
				var json = { data: facilities, cachetime: Date.now() }
				localStorage.setItem(`${cacheName}`, JSON.stringify(json));
			}
			return facilities as Facility[];
		} else {
			throw (Error())
		}
	} else {
		const facilities = cachedData?.data;
		return facilities as Facility[];
	}
};

export const facilitiesWithAvatar = async (): Promise<Facility[]> => {
	let facilities: Facility[] = [];
	try {
		facilities = await getFacilities();
	} catch (err) {
		console.error(err);
		throw (err)
	}
	let carousel = facilities.filter(function (item: any) {
		return item?.avatar?.raw
	});
	shuffle(carousel);
	return carousel
};

export const websiteSchema = asyncDerived(
	organizationStore,
	async ($organizationStore) => {
		const someds = [];
		for (let somed of $organizationStore.contact.socialnetworks) {
			someds.push(somed.url)
		}
		return {
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: $organizationStore.website_title,
			url: variables.BASE_URI,
			description: $organizationStore.website_description,
			sameAs: someds,
		}
	}
);