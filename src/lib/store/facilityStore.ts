import { getEntries } from '$lib/store/directoryStore.ts';
import { getLocalStorage } from '$lib/utils/storage';
import type { Facility } from '$lib/interfaces/facility.interface.ts';
import { variables } from '$lib/utils/constants';
import { get, asyncReadable, asyncDerived } from '@square/svelte-store';
import { browser } from "$app/environment";
import { handleRequestsWithPermissions } from '$lib/utils/requestUtils';
import { selectFacilities } from '$lib/store/selectionStore';
import { PUBLIC_FACILITIES_TTL } from '$env/static/public';
import { shuffle } from '$lib/helpers/random';
import { isExpired } from '$lib/utils/utils.ts';
import { downloadElements } from '$lib/store/directoryStore.ts';
import type { Writable, AsyncWritable, Readable, Loadable } from '@square/svelte-store';
import type { Organization } from '$lib/interfaces/organization.ts';
import type { Fetch } from '$lib/interfaces/fetch';
import type { Entry } from './directoryStoreInterface';

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
			cachedData = localStorage.getItem(`${cacheName}_${lang}`);
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
			const apiUrl = `${variables.BASE_API_URI}/organization/${lang}/`;
			const [response, err] = await handleRequestsWithPermissions(fetch, apiUrl);
			if (response) {
				let data = response;
				data?.facility.sort(function (a, b) {
					return a.contact.formatted_name.localeCompare(b.contact.formatted_name);
				})
				if (browser) {
					var json = { data: data, cachetime: Date.now() }
					localStorage.setItem(`${cacheName}_${lang}`, JSON.stringify(json));
				}
				return data as Organization;
			}
		}
	}
);

export const getAvatars = asyncDerived(
	organizationStore,
	async ($organizationStore) => {
		const cachedEffectorsObj = getLocalStorage('entries');
		let cachedEffectors = cachedEffectorsObj?.data;
		if (!cachedEffectors) {
			cachedEffectors = await getEntries();
		}
		let carousel = cachedEffectors.filter(function (item: Entry) {
			return (item?.avatar?.lt && (item?.organizations.includes($organizationStore.uid) || item?.employers.includes($organizationStore.uid)))
		});
		shuffle(carousel);
		return carousel
	});

export const getFacilities = async (skFetch: Fetch|null=null): Promise<Facility[]> => {
	const ttl = parseInt(PUBLIC_FACILITIES_TTL);
	const cacheName = "facilities";
	let cachedData;
	let expired: boolean = true;
	let empty: boolean = true;
	if (browser) {
		cachedData = localStorage.getItem(`${cacheName}`);
	}
	if (cachedData) {
		cachedData = JSON.parse(cachedData);
		expired = isExpired(ttl, cachedData.cachetime);
		if ('data' in cachedData) {
			if (cachedData.data?.length) {
				empty = false;
			}
		}
	}
	if (cachedData && !expired && !empty) {
		const facilities = cachedData.data;
		return facilities as Facility[];
	} else {
		const url = `${variables.BASE_API_URI}/facilities/`;
		const facilities: Facility[] = await downloadElements("facilities");
		//console.log(facilities.slice(2));
		if (facilities.length) {
			facilities.sort((a, b)=>{
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