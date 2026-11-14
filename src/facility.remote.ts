import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent, form, command } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import { latitude, longitude } from '$lib/Web/Facility/coordinateSchema.ts';
import type { SlugCheck } from '$lib/Web/Slug/slugView.ts';

// Whether someone may edit a facility is asked in sites/[slug]/+page.server.ts,
// not here. As a remote query it had to be awaited in the component, where the
// answer arrived after rendering on a client-side navigation and the editing
// controls stayed hidden until the page was reloaded.

const postFacility = z.object({
	name: z.string(),
    label: z.string(),
    slug: z.string().default(''),
    longitude,
    latitude,
    zoom: z.preprocess((val: string)=>{
       return Number.parseInt(val)
	},	z.number().gte(0).lte(22)),
    building: z.string(),
    street: z.string(),
    geographical_complement: z.string(),
    zip: z.string(),
	commune: z.string(),
    ban_id: z.string(),
    ban_banId: z.string()
});

export const createFacility = form(postFacility, async (data) => {
	console.log(`form data: ${JSON.stringify(data)}`);
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/facilities`;
	console.log(url);
	const request = authReq(url, 'POST', cookies, JSON.stringify(data));
	const response = await fetch(request);
	if (response.ok == false) {
		console.error(JSON.stringify(response))
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

const slugQuery = z.object({
	name: z.string().optional(),
	commune: z.string().optional(),
	street: z.string().optional(),
	zip: z.string().optional(),
	slug: z.string().optional(),
	exclude: z.string().optional(),
	// What names a facility that has no name of its own: its occupation and its person.
	effector_type: z.string().optional(),
	effector: z.string().optional()
});

// The address a facility would get, or whether a typed one is free. A command
// rather than a query: it is called with new arguments as the form changes.
export const checkFacilitySlug = command(slugQuery, async (data): Promise<SlugCheck> => {
	const params = new URLSearchParams();
	for (const key of ['name', 'commune', 'street', 'zip', 'slug', 'exclude', 'effector_type', 'effector'] as const) {
		if (data[key]) params.set(key, data[key]);
	}
	const response = await fetch(`${variables.BASE_URI}/api/v2/facility-slugs?${params}`);
	if (!response.ok) error(502, `facility-slugs answered ${response.status}`);
	return (await response.json()) as SlugCheck;
});

const putFacility = z.object({
	uid: z.string().optional(),
	name: z.string(),
    label: z.string(),
    slug: z.string(),
    longitude,
    latitude,
    zoom: z.preprocess((val: string)=>{
       return Number.parseInt(val)
	},	z.number().gte(0).lte(22)),
    building: z.string(),
    street: z.string(),
    geographical_complement: z.string(),
    zip: z.string(),
    ban_id: z.string(),
    ban_banId: z.string(),
	redirect: z.optional(z.coerce.boolean<boolean>())
});

export const updateFacility = form(putFacility, async (data) => {
	console.log(`form data: ${JSON.stringify(data)}`);
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/facilities/${data.uid}`;
	console.log(url);
	console.log(`redirect: ${data.redirect}`);
	const doRedirect: boolean = !!data.redirect;
	delete data.redirect;
	delete data.uid;
	const request = authReq(url, 'PUT', cookies, JSON.stringify(data));
	const response = await fetch(request);
	if (response.ok == false) {
		const json = await response.json()
		console.error(JSON.stringify(response))
		console.error(response.status)
		console.error(response.statusText)
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			data: json
		}
	} else {
		const json = await response.json()
		console.log(`Success! Status: ${response.status} Status text: ${response.statusText}`);
		console.log(json);
		if ( !doRedirect ) {
			return {
				success: true,
				status: response.status,
				text: response.statusText,
				data: json
			}
		}
		const redirectUrl: string = `/sites/${json.slug}?success=true`;
		redirect(303, redirectUrl );
	}
});