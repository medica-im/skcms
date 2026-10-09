import { redirect, invalid } from '@sveltejs/kit';
import { getRequestEvent, query, form, command } from '$app/server';
import { base } from '$app/paths';
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

export const createInvitee = form(CreateInvitee, async (data, issue) => {
	console.log(`form data:${JSON.stringify(data)}`);
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/invitees`;
	const request = authReq(url, 'POST', cookies, JSON.stringify(data));
	const response = await fetch(request);
	const jsn = await response.json()
	console.log(JSON.stringify(jsn))
	if (response.ok == false) {
		console.error(response.status)
		console.error(response.statusText)
		if ( ['DUPLICATE_EMAIL', 'ALREADY_MEMBER'].includes(jsn.detail?.code) ) {
			invalid(issue.email(jsn.detail.message));
		}
		invalid(jsn.detail?.message ?? response.statusText);
	} else {
		console.log(`Success! Status: ${response.status} Status text: ${response.statusText}`);
		console.log(jsn);
		return {
			success: true,
			status: response.status,
			text: response.statusText,
			response: jsn
		}
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
		redirect(303, `${base}/web/invite/invitees`);
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
		redirect(303, `${base}/web/invite/invitees`);
	}
});


/**
 * Send an invitation's email again. A value, not a throw: a refusal (used,
 * disabled, already_queued) is an answer the page words, not an error.
 */
const Resend = z.object({
	uid: z.string(),
	/** Send although the address bounced before: the administrator checked it. */
	force: z.boolean().optional()
});

/**
 * 409 codes: used, disabled, already_queued; address_rejected (the address
 * bounced: send with force once checked; reason and since say when and why)
 * and address_opted_out (the person refused this organization's mail).
 */
export const resendInvitation = command(Resend, async ({ uid, force }) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/invitees/${uid}/resend`;
	const response = await fetch(authReq(url, 'POST', cookies, JSON.stringify({ force: !!force })));
	let detail: any;
	try {
		detail = (await response.json())?.detail;
	} catch {
		detail = undefined;
	}
	if (!response.ok) {
		console.error(`POST ${url} -> ${response.status} ${JSON.stringify(detail ?? '')}`);
	}
	return {
		success: response.ok,
		status: response.status,
		code: typeof detail?.code === 'string' ? (detail.code as string) : undefined,
		reason: typeof detail?.reason === 'string' ? (detail.reason as string) : undefined,
		since: typeof detail?.since === 'string' ? (detail.since as string) : undefined
	};
});

const CorrectAddress = z.object({ uid: z.string(), email: z.string().email() });

/** A corrected address: the backend sends the invitation to it straight away. */
export const correctInviteeAddress = command(CorrectAddress, async ({ uid, email }) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/invitees/${uid}`;
	const response = await fetch(authReq(url, 'PATCH', cookies, JSON.stringify({ email })));
	if (!response.ok) {
		console.error(`PATCH ${url} -> ${response.status} ${response.statusText}`);
	}
	return { success: response.ok, status: response.status };
});

export type AddressCheck = { email: string; suggestion: string | null; problem: string | null };

/** Addresses checked before sending (backend mailer.addresscheck): warnings only. */
export const checkAddresses = command(z.array(z.string()).max(50), async (emails) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/mail/check-addresses`;
	const response = await fetch(authReq(url, 'POST', cookies, JSON.stringify({ emails })));
	if (!response.ok) {
		console.error(`POST ${url} -> ${response.status} ${response.statusText}`);
		return [] as AddressCheck[];
	}
	return (await response.json()) as AddressCheck[];
});
