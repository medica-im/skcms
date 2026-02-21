import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const RoleEnum = z.enum(['anonymous', 'registered', 'staff', 'administrator', 'superuser']);

const CreateInvitee = z.object({
	email: z.string().email(),
	role: RoleEnum,
	name: z.string().optional(),
	entry: z.string(),
	createdBy: z.string()
});

export const createInvitee = form(CreateInvitee, async (data) => {
	console.log(`form data:${JSON.stringify(data)}`);
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/invitees`;
	const request = authReq(url, 'POST', cookies, JSON.stringify(data));
	const response = await fetch(request);
	const json = await response.json()
	if (response.ok == false) {
		console.error(JSON.stringify(response))
		console.error(response.status)
		console.error(response.statusText)
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			response: json
		}
	} else {
		console.log(`Success! Status: ${response.status} Status text: ${response.statusText}`);
		console.log(json);
		redirect(303, `/web/invite/invitees`);
	}
});

const UpdateInvitee = z.object({
	id: z.string(),
	email: z.string().email().optional(),
	role: RoleEnum.optional(),
	name: z.string().optional(),
	active: z.string().transform((val) => val === 'true').pipe(z.boolean())
});

export const updateInvitee = form(UpdateInvitee, async (data) => {
	console.log(`form data:${JSON.stringify(data)}`);
	const { cookies } = getRequestEvent();
	const { id, ...updateData } = data;
	const url = `${variables.BASE_URI}/api/v2/invitees/${id}`;
	const request = authReq(url, 'PATCH', cookies, JSON.stringify(updateData));
	const response = await fetch(request);
	const json = await response.json();
	console.log("PATCH json data", JSON.stringify(json));
	if (response.ok == false) {
		return {
			success: false,
			status: response.status,
			text: response.statusText,
			data: json
		}
	} else {
		redirect(303, '/web/invite/invitees');
	}
});

const DeleteInvitee = z.object({
	id: z.string(),
	redirect: z.optional(z.coerce.boolean<boolean>())
});

export const deleteInvitee = form(DeleteInvitee, async (data) => {
	const { cookies } = getRequestEvent();
	const doRedirect: boolean = !!data.redirect;
	const url = `${variables.BASE_URI}/api/v2/invitees/${data.id}`;
	const request = authReq(url, 'DELETE', cookies);
	const response = await fetch(request);
	if (response.ok == false) {
		return {
			success: false,
			status: response.status,
			text: response.statusText
		}
	} else {
		if (!doRedirect) {
			return {
				success: true,
				status: response.status,
				text: response.statusText
			}
		}
		redirect(303, '/web/invite/invitees');
	}
});
