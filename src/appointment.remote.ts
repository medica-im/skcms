import { getRequestEvent, query, form, command } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const RoleEnum = z.enum(['anonymous', 'staff', 'administrator', 'superuser']);
const LocationEnum = z.enum(['office', 'house_call']);

const Create = z.object({
	entry: z.string().regex(/^[0-9a-fA-F]{32}$/),
	phone: z.nullable(z.string()),
	url: z.nullable(z.url({
		protocol: /^https?$/,
		hostname: z.regexes.domain
	})
	),
	location: z.nullable(LocationEnum)
});

export const createCommand = command(Create, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/appointments/`;
	const request = authReq(url, 'POST', cookies, JSON.stringify(data));
	const response = await fetch(request);
	if (response.ok == false) {
		console.error(response.status)
		console.error(response.statusText)
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

const Patch = z.object({
	uid: z.optional(z.string().regex(/^[0-9a-fA-F]{32}$/)),
	entry: z.string().regex(/^[0-9a-fA-F]{32}$/),
	phone: z.nullable(z.string()),
	url: z.nullable(z.url({
		protocol: /^https?$/,
		hostname: z.regexes.domain
	})
	),
	location: z.nullable(LocationEnum)
});

export const putCommand = command(Patch, async (data) => {
	const entry_uid = data.uid;
	delete data.uid;
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/appointments/${entry_uid}`;
	const request = authReq(url, 'PUT', cookies, JSON.stringify(data));
	const response = await fetch(request);
	if (response.ok == false) {
		console.error(response.status)
		console.error(response.statusText)
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

const Delete = z.object({
	uid: z.string().regex(/^[0-9a-fA-F]{32}$/)
});

export const deleteCommand = command(Delete, async (data) => {
	const entry_uid = data.uid;
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/appointments/${entry_uid}`;
	const request = authReq(url, 'DELETE', cookies);
	const response = await fetch(request);
	if (response.ok == false) {
		console.error(response.status)
		console.error(response.statusText)
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