import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const RoleEnum = z.enum(['anonymous', 'staff', 'administrator' , 'superuser']);


const CreateEmail = z.object({
	entry: z.string(),
	roles: z.preprocess((val: string) => {
			return val.split(',');
		}, z.array(RoleEnum)),
	email: z.string(),
});

export const createEmail = form(CreateEmail, async (data) => {
	console.log(`form data:${JSON.stringify(data)}`);
    const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/emails/`;
	const request = authReq(url, 'POST', cookies, JSON.stringify(data));
	const response = await fetch(request);
	if (response.ok == false) {
		console.error(JSON.stringify(response))
		console.error(response.status)
		console.error(response.statusText)
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: await response.json()
		}
	} else {
		const json = await response.json()
		console.log(`Success! Status: ${response.status} Status text: ${response.statusText}`);
		console.log(json);
		return {
			success: true,
			status: response.status,
			text: response.statusText
		}
	}
});

const UpdateEmail = z.object({
	id: z.string(),
	email: z.string(),
	roles: z.preprocess((val: string) => {
			console.log(val);
			return val.split(',');
		}, z.array(RoleEnum)),
});

export const updateEmail = form(UpdateEmail, async (data) => {
	console.log(`form data:${JSON.stringify(data)}`);
    const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/emails/${data.id}`;
	const request = authReq(url, 'PUT', cookies, JSON.stringify(data));
	const response = await fetch(request);
	if (response.ok == false) {
		return {
			success: false,
			status: response.status,
			text: response.statusText
		}
	} else {
		const json = await response.json()
		console.log(JSON.stringify(json));
		return {
			success: true,
			status: response.status,
			text: response.statusText
		}
	}
});

const Delete = z.object({
	id: z.string()
});

export const deleteEmail = form(Delete, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/emails/${data.id}`;
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
