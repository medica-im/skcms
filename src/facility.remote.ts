import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form, command } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const postFacility = z.object({
	name: z.string(),
    label: z.string(),
    slug: z.string(),
    longitude: z.preprocess((val: string)=>{
       return Number.parseFloat(val)
	},	z.number().min(-180).max(180)),
    latitude: z.preprocess((val: string)=>{
       return Number.parseFloat(val)
	},	z.number().min(-90).max(90)),
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
	const url = `${variables.BASE_URI}/api/v2/facilities/`;
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

const patchFacility = z.object({
	uid: z.string().optional(),
	name: z.string(),
    label: z.string(),
    slug: z.string(),
    longitude: z.preprocess((val: string)=>{
       return Number.parseFloat(val)
	},	z.number().min(-180).max(180)),
    latitude: z.preprocess((val: string)=>{
       return Number.parseFloat(val)
	},	z.number().min(-90).max(90)),
    zoom: z.preprocess((val: string)=>{
       return Number.parseInt(val)
	},	z.number().gte(0).lte(22)),
    building: z.string(),
    street: z.string(),
    geographical_complement: z.string(),
    zip: z.string(),
    ban_id: z.string(),
    ban_banId: z.string()
});

export const updateFacility = form(patchFacility, async (data) => {
	console.log(`form data: ${JSON.stringify(data)}`);
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/facilities/${data.uid}`;
	console.log(url);
	delete data.uid;
	const request = authReq(url, 'PATCH', cookies, JSON.stringify(data));
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