import { authReq } from '$lib/utils/request';
import { variables } from '$lib/utils/constants.ts';
import type { Cookies } from '@sveltejs/kit';
import type { User } from '$lib/interfaces/v2/user.ts';

/**
 * A user an entry names, and in which of the two capacities.
 *
 * Both flags rather than one role field: somebody can be owner and creator at
 * once, and that is the normal case — whoever created an entry usually still
 * owns it. The panel marks one row twice instead of showing the person twice.
 */
export interface UserWithRoles extends User {
	isOwner: boolean;
	isCreator: boolean;
}

/**
 * The people an entry's `owner` and `creator` lists name, resolved.
 *
 * Runs on the server, on the request that is already fetching the entry, and
 * takes that request's `cookies` so the lookups carry the visitor's session —
 * the path that demonstrably works. It is deliberately not a remote query
 * awaited in the component: `{#await}` renders its pending branch during SSR
 * and never resolves there, so a component doing its own resolving shipped
 * "Chargement..." in the server-rendered html and depended on a second,
 * per-uid client round trip to fill the rows. See the note on `getUser` in
 * user.remote.ts for how a failed round trip then rendered as "no users".
 *
 * A 404 on one uid is skipped rather than fatal — somebody may have been
 * deleted while an entry still names them — but any other failure is left to
 * throw, so an unauthorised or broken lookup cannot masquerade as an entry
 * with nobody attached.
 */
export async function resolveOwnerCreator(
	owner: string[] | null,
	creator: string[] | null,
	cookies: Cookies
): Promise<UserWithRoles[]> {
	const ownerUids = owner ?? [];
	const creatorUids = creator ?? [];
	// One lookup per person, not per mention: the two lists usually name the
	// same uid.
	const allUids = [...new Set([...ownerUids, ...creatorUids])];
	if (allUids.length === 0) return [];

	const resolved = await Promise.all(
		allUids.map(async (uid) => {
			const url = `${variables.BASE_URI}/api/v2/users/${uid}`;
			const response = await globalThis.fetch(authReq(url, 'GET', cookies));
			if (response.status === 404) {
				// A uid naming a user this site does not have must not take the
				// rest of the list down with it.
				console.error(`No user ${uid} on this site; entry still names them`);
				return null;
			}
			if (!response.ok) {
				throw new Error(
					`Failed to fetch user ${uid}: ${response.status} ${response.statusText}`
				);
			}
			const user = (await response.json()) as User;
			return {
				...user,
				isOwner: ownerUids.includes(uid),
				isCreator: creatorUids.includes(uid)
			} satisfies UserWithRoles;
		})
	);

	return resolved.filter((u): u is UserWithRoles => u !== null);
}
