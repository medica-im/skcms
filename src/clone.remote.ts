import { getRequestEvent, query, command } from '$app/server';
import * as z from 'zod';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

/**
 * Cloning an entry from another deployment of this app.
 *
 * Everything here goes through *this* instance's backend, never the peer's
 * directly. The clone token is a bearer credential for a superuser's whole
 * directory, and a cross-origin fetch from the page would put it into a context
 * this instance does not control — so the browser hands the token to our own
 * server and it relays.
 */

/** The peers this instance may pull from. */
export const listInstances = query(async () => {
	const { cookies } = getRequestEvent();
	const res = await fetch(
		authReq(`${variables.BASE_URI}/api/v2/clone/instances`, 'GET', cookies)
	);
	return res.ok ? await res.json() : [];
});

const relaySchema = z.object({ instance: z.string(), token: z.string() });

/** The source's entries, fetched by our server with the token. */
export const listSourceEntries = command(relaySchema, async ({ instance, token }) => {
	const { cookies } = getRequestEvent();
	const url =
		`${variables.BASE_URI}/api/v2/clone/relay/entries` +
		`?instance=${encodeURIComponent(instance)}&token=${encodeURIComponent(token)}`;
	const res = await fetch(authReq(url, 'GET', cookies));
	if (!res.ok) return { ok: false, status: res.status, entries: [] };
	return { ok: true, status: 200, entries: await res.json() };
});

const preflightSchema = z.object({
	instance: z.string(),
	token: z.string(),
	entry_uids: z.array(z.string())
});

/** What cloning these entries would do, before doing any of it. */
export const preflight = command(preflightSchema, async (body) => {
	const { cookies } = getRequestEvent();
	const res = await fetch(
		authReq(`${variables.BASE_URI}/api/v2/clone/preflight`, 'POST', cookies, JSON.stringify(body))
	);
	if (!res.ok) return { ok: false, status: res.status, entries: [] };
	return { ok: true, status: 200, entries: await res.json() };
});

const executeSchema = z.object({
	instance: z.string(),
	token: z.string(),
	resolutions: z.array(
		z.object({
			source_uid: z.string(),
			effector: z.enum(['reuse', 'create']).default('create'),
			effector_local_uid: z.string().nullable().optional(),
			facility: z.enum(['reuse', 'create']).default('create'),
			facility_local_uid: z.string().nullable().optional(),
			facility_slug_override: z.string().nullable().optional()
		})
	)
});

export const executeClone = command(executeSchema, async (body) => {
	const { cookies } = getRequestEvent();
	const res = await fetch(
		authReq(`${variables.BASE_URI}/api/v2/clone/execute`, 'POST', cookies, JSON.stringify(body))
	);
	if (!res.ok) return { ok: false, status: res.status, results: [] };
	const data = await res.json();
	return { ok: true, status: 200, results: data.results ?? [] };
});

/** Mint a token on THIS instance, for a target that asked to read it. */
export const mintExportToken = command(
	z.object({ target_origin: z.string() }),
	async ({ target_origin }) => {
		const { cookies } = getRequestEvent();
		const res = await fetch(
			authReq(
				`${variables.BASE_URI}/api/v2/clone/export-token`,
				'POST',
				cookies,
				JSON.stringify({ target_origin, entry_uids: null })
			)
		);
		if (!res.ok) return { ok: false, status: res.status, token: '' };
		const data = await res.json();
		return { ok: true, status: 200, token: data.token as string };
	}
);
