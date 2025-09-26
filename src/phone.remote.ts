import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const RoleEnum = z.enum(['anonymous', 'staff', 'administrator', 'superuser']);


const CreatePhone = z.object({
	entry: z.string(),
	type: z.enum(["M", "MW", "W", "F", "AS"]),
	roles: z.preprocess((val: string) => {
		console.log(val);
		return val.split(',');
	}, z.array(RoleEnum)),
	phone: z.string(),
});

export const createPhone = form(CreatePhone, async (data) => {
	console.log(`form data:${JSON.stringify(data)}`);
	//const jsonString = JSON.stringify(Object.fromEntries(data));
	/*let json = JSON.parse(jsonString);
	console.log(`roles: ${json.roles}`);
	console.log(`typeof(roles): ${typeof (json.roles)}`);
	const roles: string = json.roles;
	const rolesArray: string[] = roles.split(',');
	console.log(`rolesJson: ${JSON.stringify(rolesArray)}`);
	console.log(`typeof(rolesArray): ${typeof (rolesArray)}`);
	json.roles = rolesArray;
	const result = CreatePhone.safeParse(json);
	if (!result.success) {
		error(400, result.error);
	}
	const vData = result.data;
	console.log(`vData: ${JSON.stringify(vData)}`);*/
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/phones/`;
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
			text: response.statusText
		}
	}
});

const UpdatePhone = z.object({
	id: z.string(),
	type: z.enum(["M", "MW", "W", "F", "AS"]),
	phone: z.string(),
	roles: z.preprocess((val: string) => {
		console.log(val);
		return val.split(',');
	}, z.array(RoleEnum)),
});

export const updatePhone = form(UpdatePhone, async (data) => {
	console.log(`form data:${JSON.stringify(data)}`);
	//const dataObject = JSON.parse(JSON.stringify(Object.fromEntries(data)));
	//const roles = data.roles as string[];
	//console.log(`roles: ${roles}`);
	//const rolesArray: string[] = roles.split(',');
	//console.log(`rolesArray ${rolesArray}`);
	//dataObject.roles = rolesArray;
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/phones/${data.id}`;
	const request = authReq(url, 'PUT', cookies, JSON.stringify(data));
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

const DeletePhone = z.object({
	id: z.string()
});

export const deletePhone = form(DeletePhone, async (data) => {
	console.log(`form data:${JSON.stringify(data)}`);
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/phones/${data.id}`;
	const request = authReq(url, 'DELETE', cookies);
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
