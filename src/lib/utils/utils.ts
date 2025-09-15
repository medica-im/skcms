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
export function areArraysEqualSets(a1:string[], a2: string[]) {
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

export const entryPageUrl = (entry: Entry, org_category: string|null=null) => {
	const typeSlug = entry.effector_type.slug;
	const communeSlug = entry.commune.slug;
	const nameSlug = entry.slug;
	const facilitySlug = entry.facility.slug;
	//console.log(`${typeSlug}, ${communeSlug}, ${nameSlug}, ${org_category}`);
	if (org_category == 'msp') {
		return `/${facilitySlug}/${typeSlug}/${nameSlug}`;
	} else {
		return `/${typeSlug}/${communeSlug}/${nameSlug}`;
	}
}