import type { Role } from '$lib/interfaces/v2/invitee';

/**
 * Which roles a caller may offer to grant.
 *
 * A courtesy, not a guard. The endpoint is what enforces these rules, and it
 * has to: a hidden option proves nothing about a request made directly. But
 * offering an option that will certainly be refused is its own bug — the user
 * picks it, waits, and is told no for a reason the page could have known.
 *
 * Kept deliberately small and separate from the components so the two places
 * that need it — the select and the test that pins it — read the same list. The
 * rules mirror src/access/role_change.py in the backend; that file is the
 * authority, and this is the shortest statement of it that a form can use.
 */

/** Least to most privileged. */
export const HIERARCHY: Role[] = [
	'anonymous',
	'registered',
	'staff',
	'administrator',
	'superuser'
];

export function rank(role: string): number {
	return HIERARCHY.indexOf(role as Role);
}

/**
 * The roles `actor` may grant to a user currently holding `target`.
 *
 * Nobody grants a role above their own, and an administrator may not touch
 * another administrator at all — two administrators are peers, and letting one
 * demote the other turns a disagreement into a race. A superuser may grant
 * anything to anyone.
 *
 * `anonymous` is never offered: it is what the backend calls somebody with no
 * access, not a role anyone is deliberately given.
 */
export function grantableRoles(actor: string, target: string): Role[] {
	if (rank(actor) < rank('administrator')) return [];

	// An administrator works strictly below their own level, in either
	// direction — so a peer or a superuser is off limits entirely.
	if (actor !== 'superuser' && rank(target) >= rank(actor)) return [];

	const grantable = HIERARCHY.filter(
		(role) => role !== 'anonymous' && rank(role) <= rank(actor)
	);

	if (actor === 'superuser') return grantable;

	// Only a superuser demotes somebody else. An administrator may promote
	// within their level, so anything below the target's current role goes.
	return grantable.filter((role) => rank(role) >= rank(target));
}

/** Whether this caller may suspend accounts at all. */
export function maySuspend(actor: string): boolean {
	return actor === 'superuser';
}
