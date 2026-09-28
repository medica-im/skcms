import { getRequestEvent, query, command, form } from '$app/server';
import * as z from 'zod';
import { authReq, authMultipartReq, type Method } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type {
	EmailImage,
	EmailPreview,
	EmailTemplate,
	TemplateProblem
} from '$lib/Web/Email/Template/emailTemplate.ts';

/**
 * An organization's invitation email and the images it links.
 *
 * Queries answer null on failure rather than throwing: the page has no
 * <svelte:boundary>, and "could not load" is shown in place. Mutations come
 * back as values -- a refused template is the normal case while editing, and
 * its problems are what the page shows under the fields.
 */

const Kind = z.enum(['invitation']);

const Draft = z.object({
	kind: Kind,
	subject: z.string(),
	body: z.string(),
	body_text: z.string(),
	content_type: z.enum(['html', 'text'])
});

export type Outcome<T = undefined> = {
	success: boolean;
	status: number;
	data?: T;
	problems?: TemplateProblem[];
	code?: string;
};

async function call<T>(path: string, method: Method, body?: unknown): Promise<Outcome<T>> {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/${path}`;
	const request = authReq(url, method, cookies, body === undefined ? null : JSON.stringify(body));
	const response = await fetch(request);
	return outcome<T>(response, `${method} ${url}`);
}

async function outcome<T>(response: Response, what: string): Promise<Outcome<T>> {
	let json: any = undefined;
	try {
		json = response.status === 204 ? undefined : await response.json();
	} catch {
		// A proxy error page is not JSON; the status alone still says enough.
	}
	if (response.ok) {
		return { success: true, status: response.status, data: json as T };
	}
	const detail = json?.detail;
	console.error(`${what} -> ${response.status} ${response.statusText} ${JSON.stringify(detail ?? '')}`);
	return {
		success: false,
		status: response.status,
		problems: Array.isArray(detail?.problems) ? detail.problems : undefined,
		code: typeof detail?.code === 'string' ? detail.code : undefined
	};
}

/**
 * No argument, on purpose. A remote form that refreshes no query makes
 * SvelteKit re-run every query on the page, and on that path a query
 * argument reached the server as something `z.enum(['invitation'])` refused:
 * a 400, thrown on the client as an HttpError that put the whole page in its
 * error state after a refused upload. There is only one kind of email so far;
 * a second one gets a query of its own.
 */
export const getInvitationTemplate = query(async () => {
	const result = await call<EmailTemplate>('email-templates/invitation', 'GET');
	return result.success ? (result.data ?? null) : null;
});

export const saveEmailTemplate = command(Draft, async ({ kind, ...draft }) => {
	const result = await call<EmailTemplate>(`email-templates/${kind}`, 'PUT', draft);
	if (result.success) {
		await getInvitationTemplate().refresh();
	}
	return result;
});

export const resetEmailTemplate = command(Kind, async (kind) => {
	const result = await call(`email-templates/${kind}`, 'DELETE');
	if (result.success) {
		await getInvitationTemplate().refresh();
	}
	return result;
});

const PreviewRequest = Draft.extend({
	invitee_name: z.string().optional(),
	invitee_email: z.string().optional()
});

export const previewEmailTemplate = command(PreviewRequest, async ({ kind, ...draft }) => {
	return await call<EmailPreview>(`email-templates/${kind}/preview`, 'POST', draft);
});

export const listEmailImages = query(async () => {
	const result = await call<EmailImage[]>('email-images', 'GET');
	return result.success ? (result.data ?? []) : null;
});

/**
 * A form, not a command: a File cannot travel as a command argument. Returns
 * an Outcome rather than calling invalid(), so the refusal code reaches the
 * page to be translated like every other one.
 */
export const uploadEmailImage = form(
	z.object({
		file: z.file(),
		name: z.string().optional(),
		alt: z.string().optional()
	}),
	async ({ file, name, alt }) => {
		const { cookies } = getRequestEvent();
		const body = new FormData();
		// Copied into a plain File, not appended as received: the File a remote
		// form hands over is streamed lazily, and forwarded as is it reached the
		// backend with bytes PIL could not read -- while arrayBuffer() on the
		// same object returned the image intact.
		const bytes = new File([await file.arrayBuffer()], file.name, { type: file.type });
		body.append('file', bytes, file.name);
		body.append('name', name ?? '');
		body.append('alt', alt ?? '');
		const url = `${variables.BASE_URI}/api/v2/email-images`;
		const response = await fetch(authMultipartReq(url, 'POST', cookies, body));
		const result = await outcome<EmailImage>(response, `POST ${url}`);
		if (result.success) {
			await listEmailImages().refresh();
		}
		return result;
	}
);

const ImagePatch = z.object({
	uid: z.string(),
	name: z.string().optional(),
	alt: z.string().optional()
});

export const updateEmailImage = command(ImagePatch, async ({ uid, ...patch }) => {
	const result = await call<EmailImage>(`email-images/${uid}`, 'PATCH', patch);
	if (result.success) {
		await listEmailImages().refresh();
	}
	return result;
});

export const deleteEmailImage = command(z.string(), async (uid) => {
	const result = await call(`email-images/${uid}`, 'DELETE');
	if (result.success) {
		await listEmailImages().refresh();
	}
	return result;
});
