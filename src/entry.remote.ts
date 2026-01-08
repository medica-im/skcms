import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form, command } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import { slugify } from '$lib/helpers/stringHelpers';

const RoleEnum = z.enum(['anonymous', 'staff', 'administrator', 'superuser']);

const postEntry = z.object({
	effector: z.string(),
	effector_type: z.string(),
	facility: z.string(),
	memberships: z.preprocess((val: string) => {
		if (val) {
			return val.split(',');
		} else {
			return null
		}
	}, z.array(z.string()).nullable()
	),
	directory: z.string().optional(),
	organization_category: z.string().optional(),
}
);

export const createEntry = form(postEntry, async (data) => {
	console.log(`entry form data: ${JSON.stringify(data)}`);
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/entries`;
	const organization_category = data.organization_category;
	delete data.organization_category;
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
		let redirectURL;
		if (organization_category=="cpts") {
			redirectURL=`/${json.effector_type.slug}/${slugify(json.address.city)}/${json.slug}`;
		} else {
			redirectURL=`/${slugify(json.facility.slug)}/${json.effector_type.slug}/${json.slug}`;
		}
		redirect(303, redirectURL);
		return {
			success: true,
			status: response.status,
			text: response.statusText,
			data: json
		}
	}
});

const Patch = z.object({
	entry: z.string().optional(),
	//roles: z.array(RoleEnum),
	carte_vitale: z.nullable(z.boolean()).optional(),
	payment: z.nullable(z.array(z.string())).optional(),
	third_party_payer: z.nullable(z.array(z.string())).optional(),
	convention: z.nullable(z.string()).optional(),
	active: z.boolean().optional(),
	memberships: z.array(z.string()).optional()
});

export const patchCommand = command(Patch, async (data) => {
	console.log(`entry patch data: ${JSON.stringify(data)}`);
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

export const getPaymentMethods = query(async () => {
	const res = await fetch(`${variables.BASE_URI}/api/v2/payment_methods/`);
	if (res.ok) {
		return await res.json();
	}
});

export const getThirdPartyPayers = query(async () => {
	const res = await fetch(`${variables.BASE_URI}/api/v2/third_party_payers/`);
	if (res.ok) {
		return await res.json();
	}
});

export const getConventions = query(async () => {
	const res = await fetch(`${variables.BASE_URI}/api/v2/conventions/`);
	if (res.ok) {
		return await res.json();
	}
});