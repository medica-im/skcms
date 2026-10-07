import { invalid } from '@sveltejs/kit';
import { getRequestEvent, query, form, command } from '$app/server';
import * as z from "zod";
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import { slugify } from '$lib/helpers/stringHelpers';
import { redirect } from '@sveltejs/kit';
import type { EntryFull } from './lib/store/directoryStoreInterface';
import { base } from '$app/paths';

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
	isOwner: z.boolean().default(true),
	redeemEmail: z.preprocess((val) => val === '' ? undefined : val, z.email().optional()),
	access: z.string().default('anonymous')
}
);

export const createEntry = form(postEntry, async (data, issue) => {
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
		// A refusal with a code (type_not_offered) is passed as its code; the
		// form words it.
		const detail = typeof json.detail?.code === 'string' ? json.detail.code : json.detail;
		invalid(detail ?? `${response.status} ${response.statusText}`);
	} else {
		const json = await response.json() as EntryFull;
		console.log(`Success! Status: ${response.status} Status text: ${response.statusText}`);
		console.log(json);
		const redirectPath = `${base}/e/${json.entrySlug}`;
		const redirectURL = `${redirectPath}?invalidateEntries`;
		redirect(303, redirectURL)
		/*return {
			success: true,
			status: response.status,
			text: response.statusText,
			redirectURL,
		}*/
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
	memberships: z.array(z.string()).optional(),
	owners: z.array(z.string()).optional(),
	directories: z.array(z.string()).optional(),
	redeemEmail: z.nullable(z.string().email()).optional(),
	access: z.string().optional()
});

export const patchCommand = command(Patch, async (data) => {
	console.log(`entry patch data: ${JSON.stringify(data)}`);
	const entry_uid = data.entry;
	delete data.entry;
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/entries/${entry_uid}`;
	const request = authReq(url, 'PATCH', cookies, JSON.stringify(data));
	const response = await fetch(request);
	//const jsn = await response.json();
	if (response.ok == false) {
		//console.log("patchCommand json", JSON.stringify(jsn));
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

export const getAvailableDirectories = query(async () => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/directories/available`;
	const request = authReq(url, 'GET', cookies);
	const res = await fetch(request);
	if (res.ok) {
		return await res.json();
	}
	return [];
});
/**
 * Changing an entry's effector type (backend api/routers/entry_type.py).
 * Values, not throws: a refusal is an answer the page words by its code.
 */
const TypeChange = z.object({ uid: z.string(), effector_type: z.string() });

export type RemovedTag = { uid: string; label: string | null };

export const previewEntryTypeChange = command(TypeChange, async ({ uid, effector_type }) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/entries/${uid}/effector-type/preview?effector_type=${encodeURIComponent(effector_type)}`;
	const response = await fetch(authReq(url, 'GET', cookies));
	if (!response.ok) return { ok: false, removedTags: [] as RemovedTag[] };
	return { ok: true, removedTags: ((await response.json()).removed_tags ?? []) as RemovedTag[] };
});

export const changeEntryType = command(TypeChange, async ({ uid, effector_type }) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/entries/${uid}/effector-type`;
	const response = await fetch(authReq(url, 'PUT', cookies, JSON.stringify({ effector_type })));
	let body: any = undefined;
	try {
		body = await response.json();
	} catch {
		// A proxy error page is not JSON; the status still says enough.
	}
	if (response.ok) {
		return { success: true, status: response.status, slug: body?.slug as string, removedTags: (body?.removed_tags ?? []) as RemovedTag[] };
	}
	console.error(`PUT ${url} -> ${response.status} ${JSON.stringify(body?.detail ?? '')}`);
	const detail = body?.detail;
	return {
		success: false,
		status: response.status,
		code: typeof detail?.code === 'string' ? (detail.code as string) : undefined,
		// duplicate: the slug of the entry that already has this person, place and type.
		slug: typeof detail?.slug === 'string' ? (detail.slug as string) : undefined
	};
});
