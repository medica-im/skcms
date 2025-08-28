import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const RoleEnum = z.enum(['anonymous', 'staff', 'administrator' , 'superuser']);


const CreateEmail = z.object({
	entry: z.string(),
	roles: z.array(RoleEnum),
	email: z.string(),
});

export const createEmail = form(async (data) => {
	console.log(`form data:${JSON.stringify(Object.fromEntries(data))}`);
	const jsonString = JSON.stringify(Object.fromEntries(data));
    let json = JSON.parse(jsonString);
	const roles: string = json.roles;
	const rolesArray: string[] = roles.split(',');
	console.log(`rolesJson: ${JSON.stringify(rolesArray)}`);
	console.log(`typeof(rolesArray): ${typeof(rolesArray)}`);
	json.roles=rolesArray;
	const result = CreateEmail.safeParse(json);
	if (!result.success) {
		error(400, result.error);
	}
	const vData = result.data;
	console.log(`vData: ${JSON.stringify(vData)}`);
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/emails/`;
	console.log(url);
	const request = authReq(url, 'POST', cookies, JSON.stringify(vData));
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

const UpdateEmail = z.object({
	id: z.string(),
	email: z.string(),
	roles: z.array(RoleEnum),
});

export const updateEmail = form(async (data) => {
	console.log(`form data:${JSON.stringify(Object.fromEntries(data))}`);
	const jsonString = JSON.stringify(Object.fromEntries(data));
    let json = JSON.parse(jsonString);
	console.log(`roles: ${json.roles}`);
	console.log(`typeof(roles): ${typeof(json.roles)}`);
	const roles: string = json.roles;
	const rolesArray: string[] = roles.split(',');
	console.log(`rolesJson: ${JSON.stringify(rolesArray)}`);
	console.log(`typeof(rolesArray): ${typeof(rolesArray)}`);
	json.roles=rolesArray;
	const result = UpdateEmail.safeParse(json);
	if (!result.success) {
		error(400, result.error);
	}
	const vData = result.data;
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/emails/${vData.id}`;
	const request = authReq(url, 'PUT', cookies, JSON.stringify(vData));
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

export const deleteEmail = form(async (data) => {
	const dataJson = Object.fromEntries(data);
	const result = Delete.safeParse(dataJson);
	if (!result.success) {
		error(400, result.error);
	}
	const vData = result.data;
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/emails/${vData.id}`;
	const request = authReq(url, 'DELETE', cookies);
	const response = await fetch(request);
	if (response.ok == false) {
		return {
			success: false,
			status: response.status,
			text: response.statusText
		}
	} else {
		//const json = await response.json()
		return {
			success: true,
			status: response.status,
			text: response.statusText
		}
	}
});
