import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { PageServerLoad } from './$types';

/**
 * The consent screen, served by the SOURCE instance.
 *
 * The superuser arrives here from the target, signs in with the same Google
 * account, and this instance mints a token for them. Signing in *here* is the
 * whole point: a session cookie is encrypted with its own instance's
 * AUTH_SECRET, so no shared secret is needed and no instance can forge a
 * credential for another.
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.auth();
	if (!session) redirect(303, `${base}/signin?redirect=${url.pathname}${url.search}`);
	return {
		session,
		target: url.searchParams.get('target') ?? '',
		returnTo: url.searchParams.get('return') ?? `${base}/web/clone/callback`,
		instance: url.searchParams.get('instance') ?? ''
	};
};
