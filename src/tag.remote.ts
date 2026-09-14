import { getRequestEvent, query, command } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { Tag, TagCategory } from '$lib/store/directoryStoreInterface';

const RoleEnum = z.enum(['anonymous', 'staff', 'administrator', 'superuser']);

const EntryTag = z.object({
	entry: z.string(),
	addTags: z.array(z.string()).nullable(),
	removeTags: z.array(z.string()).nullable()
}
);

export const postEntryTag = command(EntryTag, async (data) => {
	console.log(`entry_tag form data: ${JSON.stringify(data)}`);
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/entry/tag`;
	const request = authReq(url, 'POST', cookies, JSON.stringify(data));
	const response = await fetch(request);
	if (response.ok == false) {
		const json = await response.json()
		console.error(JSON.stringify(json))
		console.error(response.status)
		console.error(response.statusText)
		return {
			success: false,
			status: response.status,
			text: response.statusText
		}
	} else {
		const json = await response.json()
		console.log(`Success! Status: ${response.status} Status text: ${response.statusText}`);
		console.log(json);
		return {
			success: true,
			status: response.status,
			text: response.statusText,
			data: json
		}
	}
});

export const getTagCategories = query(async () => {
	const res = await fetch(`${variables.BASE_URI}/api/v2/tag_categories`);
	if (res.ok) {
		return await res.json() as TagCategory[];
	}
});

/**
 * Every tag, for the caller to group by category.
 *
 * Here rather than fetched from the component, for the same reason
 * getTagCategories is: BASE_URI is the API's own address, while a browser-side
 * fetch built from the app's own origin resolves against `base` — '' on most
 * sites and `/annuaire` on unipa, where the API is not under the prefix. That
 * request 500d, and the tag dropdown was empty on that one site and silent
 * about it.
 *
 * No argument, deliberately. A `query` that takes one is not usable from the
 * entry page: it sets `ssr = false`, and with no server pass to serialise the
 * argument the client issues the request bare — the schema then rejects
 * "expected string, received undefined" before the handler runs. The whole
 * lexicon of tags is small enough to send at once and filter here.
 */
export const getTags = query(async () => {
	const res = await fetch(`${variables.BASE_URI}/api/v2/tags`);
	if (res.ok) {
		return await res.json() as Tag[];
	}
});
