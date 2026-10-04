import { getRequestEvent, query, command } from '$app/server';
import * as z from 'zod';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { DirectorySettings } from '$lib/interfaces/v2/directory.ts';

/**
 * This site's directories with their settings — superusers only.
 *
 * Argumentless on purpose: a form or command auto-refresh re-runs every query,
 * and one with an argument loses it and fails its schema.
 *
 * `null` when the list could not be had, which the page says in words — not an
 * empty list, which would read as "this site has no directory".
 */
export const getDirectorySettings = query(async (): Promise<DirectorySettings[] | null> => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/directories`;
	const response = await fetch(authReq(url, 'GET', cookies));
	if (response.ok) {
		return (await response.json()) as DirectorySettings[];
	}
	console.error(`Failed to fetch directories: ${response.status} ${response.statusText}`);
	return null;
});

export type DirectoryUpdateResult = {
	success: boolean;
	status: number;
	detail?: string;
};

const ListOwnerEntry = z.object({
	uid: z.string(),
	list_owner_entry: z.boolean()
});

/** Whether the directory lists its owner (the organization's entry). The backend clears the caches. */
export const setListOwnerEntry = command(
	ListOwnerEntry,
	async ({ uid, list_owner_entry }): Promise<DirectoryUpdateResult> => {
		const { cookies } = getRequestEvent();
		const url = `${variables.BASE_URI}/api/v2/directories/${uid}`;
		const response = await fetch(
			authReq(url, 'PATCH', cookies, JSON.stringify({ list_owner_entry }))
		);
		if (response.ok) {
			await getDirectorySettings().refresh();
			return { success: true, status: response.status };
		}
		let detail: string | undefined;
		try {
			detail = (await response.json())?.detail;
		} catch {
			detail = undefined;
		}
		console.error(`PATCH ${url} -> ${response.status} ${response.statusText}`);
		return { success: false, status: response.status, detail };
	}
);
