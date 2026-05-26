import { getTimestamps } from '$lib/store/directoryStore';
import { cptsPostgres, mspPostgres } from '$lib/constants';
import type { Timestamps } from '$lib/store/directoryStore';
import type { Entry } from '$lib/store/directoryStoreInterface.ts';

// Replaces the locale slug in a URL.
//
// If the `full` argument is set to `true`, the full URL is returned as a string.
// e.g. https://mywebsite.com/en/blog/article-1 => https://mywebsite.com/de/blog/article-1
//
// Otherwise (default) the URL relative to the base is returned.
// e.g. https://mywebsite.com/en/blog/article-1 => /de/blog/article-1
export const replaceLocaleInUrl = (url: URL, locale: string, full = false): string => {
	const [, , ...rest] = url.pathname.split('/')
	const new_pathname = `/${[locale, ...rest].join('/')}`
	if (!full) {
		return `${new_pathname}${url.search}`
	}
	const newUrl = new URL(url.toString())
	newUrl.pathname = new_pathname
	return newUrl.toString()
}

export const isObjectEmpty = (obj: Object) => {
	for (var i in obj) return false;
	return true;
}

export const hyphenateUuid = (i: string) => {
	return i.substring(0, 8) + "-" + i.substring(8, 12) + "-" + i.substring(12, 16) + "-" + i.substring(16, 20) + "-" + i.substring(20);
}

export function filterInPlace(array: any[], fn: Function) {
	let from = 0, to = 0;
	while (from < array.length) {
		if (fn(array[from])) {
			array[to] = array[from];
			to++;
		}
		from++;
	}
	array.length = to;
}

/** assumes array elements are primitive types
* check whether 2 arrays are equal sets.
* @param  {} a1 is an array
* @param  {} a2 is an array
*/
export function areArraysEqualSets(a1: string[], a2: string[]) {
	const superSet = {};
	for (const i of a1) {
		const e = i + typeof i;
		superSet[e] = 1;
	}

	for (const i of a2) {
		const e = i + typeof i;
		if (!superSet[e]) {
			return false;
		}
		superSet[e] = 2;
	}

	for (let e in superSet) {
		if (superSet[e] === 1) {
			return false;
		}
	}

	return true;
}
export const getByValue = (map: Map<string, string[]>, searchValue: string[]) => {
	for (let [key, value] of map.entries()) {
		if (areArraysEqualSets(value, searchValue)) {
			return key;
		}
	}
}

export const mapToString = (map: Map<string,object>, start?: number|undefined, stop?: number|undefined) => {
	if ( map==undefined ) return "undefined"
	const _array = [];
	for (let [key, value] of map) {
        _array.push(key + ' = ' + JSON.stringify(value));
    };
	return _array.slice(start, stop).join('\n')
}

export const entryPageUrl = (entry: Entry, org_category: string | null = null): string => {
	const typeSlug = entry.effector_type.slug;
	const communeSlug = entry.commune?.slug;
	const nameSlug = entry.slug;
	const facilitySlug = entry.facility?.slug;
	if (org_category == 'msp') {
		return `/${facilitySlug}/${typeSlug}/${nameSlug}`;
	}
	return `/${typeSlug}/${communeSlug}/${nameSlug}`;
}

export const entrySlugPageUrl = (entry: Entry) => {
	return `/e/${entry.entrySlug}`;
}

export function isExpired(ttl: number, cacheTime: number): boolean {
	const elapsed = Date.now() - cacheTime;
	return elapsed > ttl * 1000;
}

export async function doRefresh(endpoint: string, cachetime: number|undefined): Promise<boolean> {
	const timestamps = await getTimestamps();
	if ( timestamps === undefined ) {
		return false
	} else if ( cachetime === undefined ) {
		return true
	} else {
		return cachetime < timestamps[endpoint as keyof Timestamps]
	}
}

export function logMap(map: Map<any, any>) {
	const _arr = [];
	for (const [key, value] of map) {
        _arr.push(key + ' = ' + JSON.stringify(value))
    };
	return _arr.join('\n')
}

export function getHostnameFromURL(str: string) {
		const regexp = /(http[s]?:\/\/)?([^\/\s]+)(.*)/g
  		const array = [...str.matchAll(regexp)];
  		return array.map(m => m[2]);
}

export function entryUrl(entry: Entry, org: string) {
		let typeSlug = entry.effector_type.slug;
		let facilitySlug = entry.facility.slug;
		const communeSlug = entry.commune.slug;
		let nameSlug = entry.slug;
		if ( mspPostgres === org ) {
			return `/${facilitySlug}/${typeSlug}/${nameSlug}`;
		} else if ( cptsPostgres === org ) {
			return `/${typeSlug}/${communeSlug}/${nameSlug}`;
		}
	}

	// See: https://jsperf.com/array-filter-unique/13
/** Filter an array to only contain unique items.
 * @argument selector Select what to compare on each given item. Defaults to the item itself.
 * @example
 * [1, 2, 1, 3].filter(arrayFilterUnique())
 * // returns [1, 2, 3]
 * @returns The actual filter function to be used with `array.filter(<here>)`.
 */
export function arrayFilterUnique<T>(
	selector: (i: T) => string | number = String,
): (element: T) => boolean {
	if (arguments.length > 1) {
		throw new Error(
			"array-filter-unique has to be called as a function like `array.filter(arrayFilterUnique(<optional arg>))`",
		);
	}

	const seen: Record<string | number, boolean> = {};
	return (element: T) => {
		const toBeSearched = selector(element);

		const isNew = !(toBeSearched in seen);
		seen[toBeSearched] = true;
		return isNew;
	};
}

export function uniq(a) {
	var seen = {};
	return a.filter(function (item) {
		return seen.hasOwnProperty(item.uid) ? false : (seen[item.uid] = true);
	});
}