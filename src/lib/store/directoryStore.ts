import { writable } from '@square/svelte-store';
import { variables } from '$lib/utils/constants.ts';
import { browser } from "$app/environment";
import { handleRequestsWithPermissions } from '$lib/utils/requestUtils.ts';
import { PUBLIC_EFFECTOR_TYPE_LABELS_TTL, PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import haversine from 'haversine-distance';
import { isExpired } from '$lib/utils/utils.ts';
import { getLocalStorage, setLocalStorage } from '$lib/utils/storage.ts';
import type { Situation } from '$lib/store/directoryStoreInterface.ts';
import { getFacilities } from '$lib/store/facilityStore.ts';
import { doRefresh } from '$lib/utils/utils.ts';
import type { Writable } from '@square/svelte-store';
import type { Contact, Entry, CurrentOrg, AddressFeature, DistanceEffectors, CategorizedEntries, Type } from './directoryStoreInterface.ts';
import type { Facility } from '$lib/interfaces/facility.interface.ts';
import type { Tastypie } from '$lib/interfaces/api.interface.ts';
import type { CustomError } from '$lib/interfaces/error.interface.ts';
import type { Organization } from '$lib/interfaces/organization.ts';
import type { Fetch } from '$lib/interfaces/fetch.ts';
import type { FacilityOf } from '$lib/interfaces/facility.interface.ts';
import type { SelectType } from '$lib/interfaces/select';

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

async function fetchEntries(next: string) {
	const url = `${ORIGIN}/api/v1/entries/?limit=${variables.ENTRIES_LIMIT}${next || ""}`;
	const [response, err] = await handleRequestsWithPermissions(fetch, url);
	if (response) {
		let data: any = response;
		next = data.meta?.next;
		return [data.entries as Entry[], next]
	}
}

async function fetchEntry(uid: string) {
	const entriesUrl = `${ORIGIN}/api/v1/entries/${uid}`;
	const [response, err] = await handleRequestsWithPermissions(fetch, entriesUrl);
	if (err) {
		console.error(JSON.stringify(err));
	}
	if (response) {
		let data: any = response;
		return data;
	}
}

type ChangedObj = {
	toAdd: string[];
	toDelete: string[];
	toUpdate: string[];
};

function isUnchanged(changedObj: ChangedObj) {
	return (changedObj.toAdd?.length == 0
		&& changedObj.toDelete?.length == 0
		&& changedObj.toUpdate?.length == 0)
}

function changedContacts(contacts: Contact[], entries: Entry[]): ChangedObj {
	const changedObj: ChangedObj = {
		toAdd: [],
		toDelete: [],
		toUpdate: [],
	};
	contacts.forEach(
		(contact, index, array) => {
			let entryIndex = entries.findIndex(
				(e) => e.uid == contact.uid);
			if (entryIndex == -1) {
				changedObj.toAdd.push(contact.uid)
			} else if ((entries[entryIndex]?.updatedAt ?? 0) < contact.timestamp) {
				changedObj.toUpdate.push(contact.uid)
			}
		}
	)
	entries.forEach(
		(entry, index, array) => {
			let contact = contacts.find(
				(e) => e.uid == entry.uid);
			if (contact === undefined) {
				changedObj.toDelete.push(entry.uid)
			}
		}
	)
	return changedObj
}

async function downloadAllEntries() {
	let hasMore = true
	let next = "";
	let entries: Entry[] = [];
	while (hasMore) {
		const [_entries, _next] = await fetchEntries(next);
		entries = [...entries, ..._entries];
		if (_next === null) {
			hasMore = false;
		} else {
			next = _next
		}
	}
	setLocalStorage('entries', entries);
	return entries;
}


async function processCachedEntries(changedObj: ChangedObj) {
	let entries: Entry[] = getLocalStorage('entries')?.data;
	if (changedObj.toDelete.length) {
		entries.filter(
			(e, index, arr) => {
				let idx = changedObj.toDelete.indexOf(e.uid);
				if (idx > -1) {
					arr.splice(index, 1);
					return true;
				}
				return false;
			}
		)
		setLocalStorage('entries', entries);
	}
	if (changedObj.toAdd.length) {
		changedObj.toAdd.forEach(
			async (uid, idx, arr) => {
				const newEntry = await fetchEntry(uid);
				let count = entries.push(newEntry);
				setLocalStorage('entries', entries);
			}
		)
	}
	if (changedObj.toUpdate.length) {
		changedObj.toUpdate.forEach(
			async (uid, idx, arr) => {
				entries.filter(
					(element, index, array) => {
						if (element.uid == uid) {
							array.splice(index, 1);
							return true;
						}
						return false;
					}
				)
				const updatedEntry = await fetchEntry(uid);
				let count = entries.push(updatedEntry);
				setLocalStorage('entries', entries);
			}
		)
	}
	return entries;
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

export const getEntries = async (): Promise<Entry[]> => {
	const cachedEntriesObj = getLocalStorage('entries');
	const refresh: boolean = await doRefresh("v1:entries", cachedEntriesObj?.cachetime);
	if (refresh) {
		return await downloadAllEntries();
	} else {
		return cachedEntriesObj?.data;
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

function uniq(a) {
	var seen = {};
	return a.filter(function (item) {
		return seen.hasOwnProperty(item.uid) ? false : (seen[item.uid] = true);
	});
}

export const communes = async () => {
	const effectors = await getEntries();
	let communes = (
		uniq(effectors.map(function (currentElement) {
			return currentElement.commune
		}
		).flat()).sort(function (a, b) {
			return a.name.localeCompare(b.name);
		})
	);
	return communes
};

export const categories = async () => {
	const effectors: Entry[] = await getEntries();
	let categories = (
		uniq(effectors.map(e => e.effector_type).flat()).sort(function (a, b) {
			return a.uid.localeCompare(b.uid);
		})
	);
	return categories
};

export const getSituations = async (): Promise<Situation[]> => {
	let situations: Situation[] = [];
	const ttl = variables.SITUATIONS_TTL;
	const cacheName = "situations";
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
		situations = cachedData.data;
	} else {
		const url = `${ORIGIN}/api/v1/situations/`;
		const [response, err] = await handleRequestsWithPermissions(fetch, url);
		if (response) {
			situations = response?.situations;
			if (browser) {
				setLocalStorage(cacheName, situations);
			}
		} else if (err) {
			console.error(err);
			throw (err);
		}
	}
	return situations;
};


function distanceOfEffector(entry: Entry, distEffectors: DistanceEffectors) {
	let uid = entry.address?.facility_uid;
	if (uid) {
		return distEffectors[uid];
	} else {
		return undefined;
	}
}

function compareEffectorDistance(a, b, distEffectors: DistanceEffectors) {
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

export const fullFilteredEntriesF = (situations: Situation[], entries: Entry[], selectSituation: SelectType | null | undefined = undefined, currentOrg: Boolean | null = null, organizationStore: Organization | undefined, limitCategories: String[]): Entry[] => {
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
			if (currentOrg == true && organizationStore) {
				return x.memberships?.includes(organizationStore.uid) || x.employers?.includes(organizationStore.uid)
			} else if (currentOrg == false && organizationStore) {
				return !x.memberships?.includes(organizationStore.uid) && !x.employers?.includes(organizationStore.uid)
			} else {
				return true
			}
		}
		).filter(function (x) {
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

export const filteredEntriesF = (fullFilteredEffectors: Entry[], selectCategories: String[], selectDepartments: string[], selectCommunes: string[], selectFacility: string | null, term: string) => {
	if (!selectCategories?.length && !selectDepartments && !selectCommunes?.length && selectFacility == null && term == '') {
		return fullFilteredEffectors
	} else {
		return fullFilteredEffectors.filter(function (x) {
			if (!selectCategories?.length) {
				return true
			} else {
				return selectCategories.includes(x.effector_type.uid)
			}
		}).filter(function (x) {
			if (!selectDepartments) {
				return true
			} else {
				return selectDepartments.includes(x.department.code)
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

export const cardinalCategorizedFilteredEffectorsF = async (categorizedFilteredEffectors: CategorizedEntries) => {
	const eTL = await effectorTypeLabels();
	let cardinalMap = new Map();
	for (const [key, value] of categorizedFilteredEffectors) {
		let label = key;
		let countF: number = 0;
		let countM: number = 0;
		let countN: number = 0;
		let countNone: number = 0;
		let type: Type = value[0].effector_type;
		/*value.forEach(
			(e) => {
				type = e.types.find(e => e.name == key)
			}
		);
		if (type === undefined) {
			throw new Error('Type not found');
		}*/
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

export const categoryOfF = (fullFilteredEntries: Entry[], selectCommunes: string[], selectDepartments: string[], selectFacility: string | null): Type[] => {
	if (!Array.isArray(fullFilteredEntries)) {
		return []
	}
	if (!selectCommunes.length && !selectDepartments && selectFacility == null) {
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
						(!(selectCommunes.length) || selectCommunes.includes(x.commune.uid)) && (!selectFacility || selectFacility == x.facility.uid) && (!selectDepartments || selectDepartments.includes(x.department.code))
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

export const communeOfF = (fullFilteredEntries: Entry[], selectCategories: string[], selectDepartments: string[], selectFacility: string | null) => {
	if (!selectCategories?.length && !selectDepartments && !selectFacility) {
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
				) && (!selectFacility || x.facility.uid == selectFacility) && (!selectDepartments || selectDepartments.includes(x.department.code))
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

export const facilityOfF = (fullFilteredEntries: Entry[], selectCategories: string[], selectCommunes: string[], selectDepartments: string[]) => {
	const facilities: FacilityOf[] = fullFilteredEntries.filter(
		x => {
			return (!selectCategories?.length || selectCategories.includes(x.effector_type.uid)
			) && (!selectCommunes?.length || selectCommunes.includes(x.commune.uid)) && (!selectDepartments || selectDepartments.includes(x.department.code))
		}
	).map((x) => {
		return { ...x.facility, ...x.address }
	});
	const mapFromFacilities = new Map(
		facilities.map(f => [f.uid, f])
	);
	const uniqueFacilities = [...mapFromFacilities.values()];
	return uniqueFacilities
};