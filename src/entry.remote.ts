import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form, command } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const RoleEnum = z.enum(['anonymous', 'staff', 'administrator' , 'superuser']);

const Patch = z.object({
	entry: z.string().optional(),
	//roles: z.array(RoleEnum),
	carte_vitale: z.nullable(z.boolean()),
});

export const patchCommand = command(Patch, async (data) => {
	const entry_uid = data.entry;
	delete data.entry;
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/entries/${entry_uid}`;
	const request = authReq(url, 'PATCH', cookies, JSON.stringify(data));
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


export const patchForm = form(async (data) => {
	const entry_uid = data.get('entry');
	data.delete('entry');
	console.log(`form data:${JSON.stringify(Object.fromEntries(data))}`);
	const jsonString = JSON.stringify(Object.fromEntries(data));
    let json = JSON.parse(jsonString);
	//const roles: string = json.roles;
	//const rolesArray: string[] = roles.split(',');
	const result = Patch.safeParse(json);
	if (!result.success) {
		error(400, result.error);
	}
	const vData = result.data;
	console.log(`vData: ${JSON.stringify(vData)}`);
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/entries/${entry_uid}`;
	console.log(url);
	const request = authReq(url, 'PATCH', cookies, JSON.stringify(vData));
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
			text: response.statusText
		}
	}
});