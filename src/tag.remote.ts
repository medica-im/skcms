import { getRequestEvent, query, form, command } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const RoleEnum = z.enum(['anonymous', 'staff', 'administrator', 'superuser']);

const EntryTag = z.object({
	entry: z.string(),
	addTags: z.preprocess((val: string) => {
		console.log(val);
		console.log(typeof val);
		if (val) {
			return val.split(',');
		} else {
			return null
		}
	}, z.array(z.string()).nullable()
	),
	removeTags: z.preprocess((val: string) => {
		console.log(val);
		console.log(typeof val);
		if (val) {
			return val.split(',');
		} else {
			return null
		}
	}, z.array(z.string()).nullable()
	),
}
);

export const postEntryTag = form(EntryTag, async (data) => {
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
		return await res.json();
	}
});