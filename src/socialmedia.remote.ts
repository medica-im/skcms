import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const RoleEnum = z.enum(['anonymous', 'staff', 'administrator', 'superuser']);

const Create = z.object({
	entry: z.string(),
	type: z.string(),
	roles: z.preprocess((val: string) => {
		return val.split(',');
	}, z.array(RoleEnum)),
	url: z.string(),
});

const path = '/api/v2/socialmedia/';

export const create = form(Create, async (data) => {
	console.log(`form data:${JSON.stringify(data)}`);
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}${path}`;
 	const request = authReq(url, 'POST', cookies, JSON.stringify(data));
	const response = await fetch(request);
	if (response.ok == false) {
		console.error(JSON.stringify(response))
		console.error(response.status)
		console.error(response.statusText)
		const resJson = await response.json();
		console.error(resJson);
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: resJson,
		}
	} else {
		return {
			success: true,
			status: response.status,
			text: response.statusText
		}
	}
});

const Update = z.object({
	id: z.string().optional(),
	url: z.string(),
	type: z.string(),
	roles: z.preprocess((val: string) => {
		return val.split(',');
	}, z.array(RoleEnum)),
});

export const updateForm = form(Update, async (data) => {
	console.log(`form data:${JSON.stringify(data)}`);
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}${path}${data.id}`;
	delete data.id;
	const request = authReq(url, 'PUT', cookies, JSON.stringify(data));
	const response = await fetch(request);
	if (response.ok == false) {
		const resJson = await response.json();
		console.error(resJson);
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: resJson,
		}
	} else {
		const resJson = await response.json()
		console.log(JSON.stringify(resJson));
		return {
			success: true,
			status: response.status,
			text: response.statusText,
			response: resJson
		}
	}
});

const Destroy = z.object({
	id: z.string()
});

export const destroy = form(Destroy, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}${path}${data.id}`;
	const request = authReq(url, 'DELETE', cookies);
	const response = await fetch(request);
	if (response.ok == false) {
		return {
			success: false,
			status: response.status,
			text: response.statusText
		}
	} else {
		return {
			success: true,
			status: response.status,
			text: response.statusText
		}
	}
});
