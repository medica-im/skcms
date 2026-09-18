import { getRequestEvent, query, command } from '$app/server';
import * as z from 'zod';
import { authReq, type Method } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { User } from '$lib/interfaces/v2/user.ts';

/**
 * One user, or `null` if this site has never heard of them.
 *
 * The two failure kinds are kept apart on purpose, because collapsing them is
 * what hid an empty owner panel for so long. This used to log and fall through
 * on *any* non-OK response, returning `undefined`: a 401 was then
 * indistinguishable from "no such user", and a caller's `if (user)` dropped the
 * row without anything reaching an error path. Nothing on screen, nothing in
 * the catch, and a console line no visitor reads.
 *
 *   - 404 is a fact about the data, not a failure: somebody may have been
 *     deleted while an entry still names them. It comes back as `null` so a
 *     caller resolving a list can skip that one and keep the rest.
 *   - anything else — 401, 403, a proxy 502 — means the answer is unknown
 *     rather than empty, so it throws and the caller has to say so.
 */
export const getUser = query(z.string(), async (uid) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/users/${uid}`;
	const request = authReq(url, 'GET', cookies);
	const response = await fetch(request);
	if (response.ok) {
		return await response.json() as User;
	}
	if (response.status === 404) {
		return null;
	}
	console.error(`Failed to fetch user ${uid}: ${response.status} ${response.statusText}`);
	throw new Error(`Failed to fetch user ${uid}: ${response.status} ${response.statusText}`);
});

export const getUsers = query(async () => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/users`;
	const request = authReq(url, 'GET', cookies);
	const response = await fetch(request);
	if (response.ok) {
		return await response.json() as User[];
	}
	console.error(`Failed to fetch users: ${response.status} ${response.statusText}`);
});

// The access history is deliberately *not* a remote query. The user detail
// route is client-only (`ssr = false`), and a query issued from such a page
// arrives at the server without its argument — refused by the schema before the
// handler runs. It is loaded in that route's +page.server.ts instead.

/**
 * What the server said about a privileged act.
 *
 * The refusals are the normal case here, not the exception — most role changes
 * a page can offer are ones somebody may not make — so they come back as a
 * value with the reason attached rather than as a thrown error. 403 and 409 mean
 * different things to the reader ("not yours to do" against "cannot be done at
 * all"), so the status is kept rather than flattened to a boolean.
 */
export type RoleChangeResult = {
	success: boolean;
	status: number;
	detail?: string;
};

async function send(url: string, method: Method, body?: unknown): Promise<RoleChangeResult> {
	const { cookies } = getRequestEvent();
	const request = authReq(url, method, cookies, body ? JSON.stringify(body) : null);
	const response = await fetch(request);
	if (response.ok) {
		return { success: true, status: response.status };
	}
	// The body may be empty or not JSON at all on a proxy error, and a page
	// that failed to explain a refusal because parsing the refusal failed is
	// worse than one that says only "refused".
	let detail: string | undefined;
	try {
		detail = (await response.json())?.detail;
	} catch {
		detail = undefined;
	}
	console.error(`${method} ${url} -> ${response.status} ${response.statusText}`);
	return { success: false, status: response.status, detail };
}

const ChangeRole = z.object({
	uid: z.string(),
	role: z.string()
});

export const changeUserRole = command(ChangeRole, async ({ uid, role }) => {
	return await send(`${variables.BASE_URI}/api/v2/users/${uid}/role`, 'PATCH', { role });
});

const Suspend = z.object({
	uid: z.string(),
	reason: z.string().optional()
});

export const suspendUser = command(Suspend, async ({ uid, reason }) => {
	return await send(`${variables.BASE_URI}/api/v2/users/${uid}/suspension`, 'POST', { reason });
});

export const restoreUser = command(z.string(), async (uid) => {
	return await send(`${variables.BASE_URI}/api/v2/users/${uid}/suspension`, 'DELETE');
});
