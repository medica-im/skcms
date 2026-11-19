import { getRequestEvent, query, command } from '$app/server';
import * as z from 'zod';
import { authReq } from '#lib/utils/request.ts';
import { variables } from '#lib/utils/constants.ts';

/**
 * Cloning an entry from another deployment of this app.
 *
 * Everything here goes through *this* instance's backend, never the peer's
 * directly. The clone token is a bearer credential for a superuser's whole
 * directory, and a cross-origin fetch from the page would put it into a context
 * this instance does not control — so the browser hands the token to our own
 * server and it relays.
 */

/** This site's directories, the main one first: the one a clone lists and writes into. */
export const listDirectories = query(async () => {
	const { cookies } = getRequestEvent();
	const res = await fetch(authReq(`${variables.BASE_URI}/api/v2/directories`, 'GET', cookies));
	if (!res.ok) return [];
	const rows = (await res.json()) as { name: string; display_name: string | null; main: boolean }[];
	return rows.sort((a, b) => Number(b.main) - Number(a.main));
});

/** The peers this instance may pull from. */
export const listInstances = query(async () => {
	const { cookies } = getRequestEvent();
	const res = await fetch(authReq(`${variables.BASE_URI}/api/v2/clone/instances`, 'GET', cookies));
	return res.ok ? await res.json() : [];
});

const relaySchema = z.object({
	instance: z.string(),
	token: z.string(),
	directory: z.string().nullable().optional()
});

/** The source's entries, fetched by our server with the token. */
export const listSourceEntries = command(relaySchema, async ({ instance, token, directory }) => {
	const { cookies } = getRequestEvent();
	const url =
		`${variables.BASE_URI}/api/v2/clone/relay/entries` +
		`?instance=${encodeURIComponent(instance)}&token=${encodeURIComponent(token)}` +
		(directory ? `&directory=${encodeURIComponent(directory)}` : '');
	const res = await fetch(authReq(url, 'GET', cookies));
	if (!res.ok) return { ok: false, status: res.status, entries: [], alreadyHere: {}, origin: '' };
	const data = await res.json();
	return {
		ok: true,
		status: 200,
		entries: data.entries ?? [],
		// Source uid -> local slug for entries this instance already has, so the
		// picker can grey them out rather than let preflight reject them later.
		alreadyHere: (data.already_here ?? {}) as Record<string, string>,
		// Avatar paths are relative to the source, not to us.
		origin: (data.origin ?? '') as string
	};
});

/** How the source directory's settings differ from this one's. */
export const directoryDifferences = command(relaySchema, async ({ instance, token, directory }) => {
	const { cookies } = getRequestEvent();
	const url =
		`${variables.BASE_URI}/api/v2/clone/relay/directory` +
		`?instance=${encodeURIComponent(instance)}&token=${encodeURIComponent(token)}` +
		(directory ? `&directory=${encodeURIComponent(directory)}` : '');
	const res = await fetch(authReq(url, 'GET', cookies));
	if (!res.ok) return { ok: false, status: res.status, differences: [] };
	return { ok: true, status: 200, differences: await res.json() };
});

/** Copy the chosen settings; the backend reads their values from the source itself. */
export const applyDirectorySettings = command(
	relaySchema.extend({ keys: z.array(z.string()) }),
	async (body) => {
		const { cookies } = getRequestEvent();
		const res = await fetch(
			authReq(
				`${variables.BASE_URI}/api/v2/clone/directory/apply`,
				'POST',
				cookies,
				JSON.stringify(body)
			)
		);
		if (!res.ok) return { ok: false, status: res.status, applied: [], warnings: [] };
		const data = await res.json();
		return { ok: true, status: 200, applied: data.applied ?? [], warnings: data.warnings ?? [] };
	}
);

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
	source_org_entry: z.string().nullable().optional(),
	directory: z.string().nullable().optional(),
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
	z.object({ target_origin: z.string(), directory: z.string().nullable().optional() }),
	async ({ target_origin, directory }) => {
		const { cookies } = getRequestEvent();
		const res = await fetch(
			authReq(
				`${variables.BASE_URI}/api/v2/clone/export-token`,
				'POST',
				cookies,
				JSON.stringify({ target_origin, entry_uids: null, directory: directory || null })
			)
		);
		if (!res.ok) {
			// Carry the backend's reason through. A bare status leaves the reader
			// guessing between "wrong role" and "this peer is not registered
			// here", which need completely different fixes.
			let detail = '';
			try {
				detail = (await res.json())?.detail ?? '';
			} catch {
				/* an error page rather than JSON */
			}
			return { ok: false, status: res.status, token: '', orgEntry: '', directory: '', detail };
		}
		const data = await res.json();
		return {
			ok: true,
			status: 200,
			token: data.token as string,
			// The source's own organization entry. Carried back so the target can
			// remap a MEMBER_OF edge pointing at it — the token is opaque to the
			// target, so this cannot travel inside it.
			orgEntry: (data.org_entry ?? '') as string,
			directory: (data.directory ?? '') as string,
			detail: ''
		};
	}
);
