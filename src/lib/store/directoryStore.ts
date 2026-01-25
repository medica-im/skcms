import { writable } from '@square/svelte-store';
import { variables } from '$lib/utils/constants.ts';
import { browser } from "$app/environment";
import { handleRequestsWithPermissions } from '$lib/utils/requestUtils.ts';
import { PUBLIC_EFFECTOR_TYPE_LABELS_TTL, PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import haversine from 'haversine-distance';
import { isExpired } from '$lib/utils/utils.ts';
import { setLocalStorage } from '$lib/utils/storage.ts';
import type { Situation } from '$lib/store/directoryStoreInterface.ts';
import { uniq } from '$lib/utils/utils.ts';
import type { Writable } from '@square/svelte-store';
import type { Entry, AddressFeature, DistanceEffectors, CategorizedEntries, Type } from './directoryStoreInterface.ts';
import type { Tastypie } from '$lib/interfaces/api.interface.ts';
import type { CustomError } from '$lib/interfaces/error.interface.ts';
import type { Organization } from '$lib/interfaces/organization.ts';
import type { FacilityOf } from '$lib/interfaces/facility.interface.ts';
import type { SelectType } from '$lib/interfaces/select';
import type { Tag } from '$lib/store/directoryStoreInterface.ts';
import type { Fetch } from '$lib/interfaces/fetch.ts';
import type { Labels } from '$lib/interfaces/label.interace.ts';

export const term: Writable<string> = writable("");

function normalize(x: string) {
	return x.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export const effectorTypeLabels = async () => {
	var cachelife = parseInt(PUBLIC_EFFECTOR_TYPE_LABELS_TTL);
	const cacheName = "effector_type_labels";
	let cachedData;
	let expired: boolean = true;
	let empty: boolean = true;
	if (browser) {
		cachedData = localStorage.getItem(`${cacheName}`);
	}
	if (cachedData) {
		cachedData = JSON.parse(cachedData);
		let elapsed = Date.now() - cachedData.cachetime;
		expired = elapsed > cachelife * 1000;
		if ('data' in cachedData) {
			if (cachedData.data) {
				empty = false;
			}
		}
	}
	if (cachedData && !expired && !empty) {
		return cachedData.data;
	} else {
		const url = `${ORIGIN}/api/v1/directory/effector_type_labels/`;
		const response = await fetch(url);
		try {
			if (!response.ok) {
				throw new Error(`Response status: ${response.status}`);
			}
			let data = await response.json();
			if (browser) {
				let json = { data: data, cachetime: Date.now() }
				localStorage.setItem(`${cacheName}`, JSON.stringify(json));
			}
			return data;
		} catch (error: any) {
			console.error(error.message);
		}
	}
};

export async function fetchElements(path: string, next: string, limit: number | null = null): Promise<[any[], string | null]> {
	const limit_qs: string = limit ? `?limit=${limit}` : '';
	const url = `${ORIGIN}/api/v1/${path}/${limit_qs}${next || ""}`;
	const [data, err]: [Tastypie, CustomError] = await handleRequestsWithPermissions(fetch, url);
	const _next = data?.meta?.next;
	const objects = data[path] as any[];
	return [objects, _next]
};

export async function downloadElements(path: string, limit: number = 100,) {
	let hasMore = true;
	let data: any[] = [];
	let next = "";
	while (hasMore) {
		const [_elements, _next] = await fetchElements(path, next, limit);
		data = [...data, ..._elements];
		if (!_next) {
			hasMore = false;
		} else {
			next = _next
		}
	}
	return data
}

export interface Timestamps {
	"v1:facilities": number,
	"v1:effector_type_labels": number,
	"v1:entries": number,
}

export const getTimestamps = async (): Promise<Timestamps | undefined> => {
	const url = `${ORIGIN}/api/v1/directory/timestamps`;
	try {
		const res = await fetch(url);
		if (res.ok) {
			return await res.json()
		} else {
			console.error(res.status);
		}
	} catch (error) {
		console.error(error);
	}
};

export const distanceEffectorsF = (entries: Entry[], addressFeature: AddressFeature | null) => {
	const targetGeoJSON = addressFeature?.geometry?.coordinates;
	if (!targetGeoJSON) {
		return {};
	}
	const distanceOfEffector: DistanceEffectors = {};
	for (const entry of entries) {
		let longitude = entry.address.longitude;
		let latitude = entry.address.latitude;
		if (!longitude || !latitude) {
			continue;
		}
		const effectorGeoJSON = [parseFloat(longitude), parseFloat(latitude)] as any;
		const dist = haversine(targetGeoJSON, effectorGeoJSON);
		distanceOfEffector[entry.address.facility_uid] = dist;
	}
	return distanceOfEffector;
};

export const getSituationsV2 = async (fetch: Fetch): Promise<Situation[] | undefined> => {
	let situations;
	let response;
	try {
		response = await fetch(`${ORIGIN}/api/v2/situations`);
		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}
		situations = await response.json() as Situation[];
	} catch (error: any) {
		console.error('There was an error while retrieving entries from layout.ts', error.message);
	}
	return situations
};

function distanceOfEffector(entry: Entry, distEffectors: DistanceEffectors) {
	let uid = entry.address?.facility_uid;
	if (uid) {
		return distEffectors[uid];
	} else {
		return undefined;
	}
}

function compareEffectorDistance(a: Entry, b: Entry, distEffectors: DistanceEffectors) {
	let dist_a = distanceOfEffector(a, distEffectors);
	let dist_b = distanceOfEffector(b, distEffectors);
	if (!dist_a && !dist_b) {
		return 0;
	} else if (!dist_a) {
		return 1;
	} else if (!dist_b) {
		return -1;
	} else {
		return (dist_a - dist_b);
	}
}

export const fullFilteredEntriesF = (situations: Situation[], entries: Entry[], selectSituation: SelectType | null | undefined = undefined, currentOrg: Boolean | null = null, organization: Organization | undefined, limitCategories: String[]): Entry[] => {
	if (
		!selectSituation
		&& currentOrg === null
		&& !limitCategories?.length
	) {
		return entries
	} else {
		return entries.filter(function (x) {
			if (!limitCategories?.length) {
				return true
			} else {
				return limitCategories.includes(x.effector_type.slug)
			}
		}).filter(function (x) {
			if (currentOrg == true && organization) {
				return x.memberships?.includes(organization.uid) || x.employers?.includes(organization.uid) || x.uid === organization.uid
			} else if (currentOrg == false && organization) {
				return !x.memberships?.includes(organization.uid) && !x.employers?.includes(organization.uid)
			} else {
				return true
			}
		}).filter(function (x) {
			if (selectSituation === undefined) {
				return true
			} else {
				let entries = situations.find(obj => { return obj.uid === selectSituation?.value })?.entries;
				if (entries) {
					return entries.includes(x.uid);
				} else {
					return false
				}
			}
		})
	}
};

export const filteredEntriesF = (fullFilteredEffectors: Entry[], selectCategories: String[], selectDepartment: {label: string, value: string} | null, selectCommunes: string[], selectFacility: string | null, term: string, selectTags: Tag[] | null) => {
	if (!selectCategories?.length && !selectDepartment && !selectCommunes?.length && selectFacility == null && term == '' && selectTags === null) {
		return fullFilteredEffectors
	} else {
		return fullFilteredEffectors.filter(function (x) {
			if (!selectCategories?.length) {
				return true
			} else {
				return selectCategories.includes(x.effector_type.uid)
			}
		}).filter(function (x) {
			if (!selectDepartment) {
				return true
			} else {
				return selectDepartment.value===x.department.code
			}
		}).filter(function (x) {
			if (!selectCommunes?.length) {
				return true
			} else {
				return selectCommunes.includes(x.commune.uid)
			}
		}).filter(function (x) {
			if (selectFacility == null) {
				return true
			} else {
				return selectFacility == x.facility.uid
			}
		}).filter(function (x) {
			if (term == '') {
				return true
			} else {
				return normalize(x.name).includes(normalize(term))
			}
		}).filter(function (x) {
			if (selectTags === null) {
				return true
			} else {
				return selectTags.map(t => t.uid).every((e) => (x.tags?.map(t => t.uid).includes(e)))
			}
		})
	}
}

export const categorizedFilteredEffectorsF = (filteredEffectors: Entry[], distanceEffectors: DistanceEffectors | null = null, selectSituation: SelectType | null | undefined = undefined) => {
	let categorySet: Set<string> = new Set();
	for (let effector of filteredEffectors) {
		categorySet.add(effector.effector_type.name)
	}
	let categoryArr = Array.from(categorySet);
	categoryArr.sort();
	const effectorsObj: Record<string, Entry[]> = categoryArr.reduce((acc: Record<string, []>, current) => {
		acc[current] = [];
		return acc;
	}, {});
	for (let effector of filteredEffectors) {
		effectorsObj[effector.effector_type.name].push(effector)
	}

	const sortedEffectorsObj = selectSituation ? Object.entries(effectorsObj).sort((a, b) => a[1].length - b[1].length) : Object.entries(effectorsObj).sort(function (a, b) {
		return a[0].localeCompare(b[0]);
	});
	const effectorsMap = new Map(sortedEffectorsObj);
	if (distanceEffectors) {
		effectorsMap.forEach((value) => value.sort((a, b) => compareEffectorDistance(a, b, distanceEffectors)))
	}
	return effectorsMap as CategorizedEntries;
};

export const cardinalCategorizedFilteredEffectorsF = (categorizedFilteredEffectors: CategorizedEntries, eTL: Labels): Map<string, Entry[]> => {
	let cardinalMap = new Map();
	for (const [key, value] of categorizedFilteredEffectors) {
		let label: string | null = key;
		let countF: number = 0;
		let countM: number = 0;
		let countN: number = 0;
		let countNone: number = 0;
		let type: Type = value[0].effector_type;
		value.forEach(
			(e) => {
				if (e.gender == 'F') {
					countF += 1;
				} else if (e.gender == 'M') {
					countM += 1;
				} else if (e.gender == 'N') {
					countN += 1;
				} else if (e.gender == undefined) {
					countNone += 1;
				}
			}
		)
		if (value.length == countNone || value.length == countN) {
			if (value.length > 1) {
				try {
					label = eTL[type.uid]['P']['N']
				} catch (error) {
					console.error(error);
					console.error(key);
				}
			} else {
				try {
					label = eTL[type.uid]['S']['N']
				} catch (error) {
					console.error(error);
					console.error(key);
				}
			}
		} else {
			if (value.length > 1) {
				if (countF > countM) {
					try {
						label = eTL[type.uid]['P']['F']
					} catch (error) {
						console.error(error);
						console.error(key);
					}
				} else {
					try {
						label = eTL[type.uid]['P']['M']
					} catch (error) {
						console.error(error);
						console.error(key);
					}
				}
			} else {
				if (countF > countM) {
					try {
						label = eTL[type.uid]['S']['F']
					} catch (error) {
						console.error(error);
						console.error(key);
					}
				} else {
					try {
						label = eTL[type.uid]['S']['M']
					} catch (error) {
						console.error(error);
						console.error(key);
					}
				}
			}
		}
		cardinalMap.set(label, value)
	}
	return cardinalMap;
};

export const categorizedFullFilteredEffectorsF = (fullFilteredEffectors: Entry[]) => {
	let categorySet = new Set();
	for (let effector of fullFilteredEffectors) {
		categorySet.add(effector.effector_type.name)
	}
	let categoryArr = Array.from(categorySet);
	categoryArr.sort();
	const effectorsObj = categoryArr.reduce((acc: Record<string, []>, current) => {
		acc[current] = [];
		return acc;
	}, {});
	for (let effector of fullFilteredEffectors) {
		effectorsObj[effector.effector_type.name].push(effector)
	}
	const effectorsMap = new Map(Object.entries(effectorsObj).sort((a, b) => a[1].length - b[1].length));
	return effectorsMap as CategorizedEntries;
}

const uniqueArray = (objects: any, uniqueBy: string[], keepFirst = true) => {
	return Array.from(
		objects.reduce((map: Map<any, any>, e: any) => {
			let key = uniqueBy.map(key => [e[key], typeof e[key]]).flat().join('-')
			if (keepFirst && map.has(key)) return map
			return map.set(key, e)
		}, new Map()).values()
	)
}

export const categoryOfF = (fullFilteredEntries: Entry[], selectCommunes: string[], selectDepartment: {label: string, value: string} | null, selectFacility: string | null): Type[] => {
	if (!Array.isArray(fullFilteredEntries)) {
		return []
	}
	if (!selectCommunes.length && !selectDepartment && selectFacility == null) {
		return uniq(
			fullFilteredEntries.map(
				function (x) {
					return x.effector_type
				}
			)
		)
	} else {
		return uniq(
			fullFilteredEntries.filter(
				function (x) {
					return (
						(!(selectCommunes.length) || selectCommunes.includes(x.commune.uid)) && (!selectFacility || selectFacility == x.facility.uid) && (!selectDepartment || selectDepartment.value===x.department.code)
					)
				}
			).map(
				function (x) {
					return x.effector_type
				}
			)
		)
	}
}

export const departmentOfF = (fullFilteredEntries: Entry[], selectFacility: string | null, selectCategories: string[], selectCommunes: String[]) => {
	if (!selectCategories?.length && !selectFacility && !selectCommunes.length) {
		const allDpts = fullFilteredEntries.map(x => x.department.code);
		const uniqueDpts = [...new Set(allDpts)];
		return uniqueDpts;
	} else {
		const dpts = fullFilteredEntries.filter(
			x => {
				return (!selectCategories?.length || selectCategories.includes(x.effector_type.uid)
				) && (!selectFacility || x.facility.uid == selectFacility) && (!selectCommunes.length || selectCommunes.includes(x.commune.uid))
			}
		).map(x => x.department.code);
		const uniqueDpts = [...new Set(dpts)];
		return uniqueDpts;
	}
}

export const communeOfF = (fullFilteredEntries: Entry[], selectCategories: string[], selectDepartment: {label: string, value: string} | null, selectFacility: string | null) => {
	if (!selectCategories?.length && !selectDepartment && !selectFacility) {
		const allCommunes = fullFilteredEntries.map(x => x.commune);
		const mapFromCommunes = new Map(
			allCommunes.map(c => [c.uid, c])
		);
		const uniqueCommunes = [...mapFromCommunes.values()];
		return uniqueCommunes;
	} else {
		const communes = fullFilteredEntries.filter(
			x => {
				return (!selectCategories?.length || selectCategories.includes(x.effector_type.uid)
				) && (!selectFacility || x.facility.uid == selectFacility) && (!selectDepartment || selectDepartment.value===x.department.code)
			}
		).map(x => x.commune);
		const mapFromCommunes = new Map(
			communes.map(
				(c) => {
					return [c.uid, c]
				}
			)
		);
		const uniqueCommunes = [...mapFromCommunes.values()];
		return uniqueCommunes;
	}
}

export const facilityOfF = (fullFilteredEntries: Entry[], selectCategories: string[], selectCommunes: string[], selectDepartment: {label: string, value: string} | null) => {
	let entries: Entry[];
	let facilities: FacilityOf[];
	if (!selectCategories?.length && !selectCommunes?.length && !selectDepartment) {
		entries = fullFilteredEntries;
	} else {
		entries = fullFilteredEntries.filter(
			x => {
				(!selectCategories?.length || selectCategories.includes(x.effector_type.uid)
				) && (!selectCommunes?.length || selectCommunes.includes(x.commune.uid)) && (!selectDepartment || selectDepartment.value===x.department.code)
			}
		)
	}
	facilities = entries.map((x) => {
		return { ...x.facility, ...x.address }
	});
	const mapFromFacilities = new Map(
		facilities.map(f => [f.uid, f])
	);
	const uniqueFacilities = [...mapFromFacilities.values()];
	return uniqueFacilities
};

export const tagOfF = (fullFilteredEntries: Entry[], selectFacility: string | null, selectCategories: string[], selectCommunes: String[], selectDepartment: {label: string, value: string} | null): Tag[] => {
	if (!selectCategories?.length && !selectFacility && !selectCommunes.length && !selectDepartment) {
		const allTags = fullFilteredEntries.filter((x) => x.tags !== null).map(x => x.tags).flat();
		const uniqueTags = uniqueArray(allTags, ["uid"]);
		return uniqueTags as Tag[];
	} else {
		const tags = fullFilteredEntries.filter(
			x => {
				return (!selectCategories?.length || selectCategories.includes(x.effector_type.uid)
				) && (!selectFacility || x.facility.uid == selectFacility) && (!selectCommunes.length || selectCommunes.includes(x.commune.uid)) && (!selectDepartment || selectDepartment.value===x.department.code)
			}
		).map(x => x.tags).flat();
		const uniqueTags = uniqueArray(tags, ["uid"]);
		return uniqueTags as Tag[];
	}
}