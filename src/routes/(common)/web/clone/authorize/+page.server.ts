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
	// The target has to be an absolute https origin, checked here rather than
	// trusted from the query string. Empty or relative, the browser resolves
	// `${target}${returnTo}` against the current document and produces a
	// file:/// URL — which the page then refuses to navigate to, with a security
	// error that says nothing about the missing parameter.
	//
	// The backend checks it again against the peer registry before minting
	// anything; this is only so the page can say what is wrong.
	const raw = url.searchParams.get('target') ?? '';
	let target = '';
	let targetError: string | null = null;
	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== 'https:') targetError = 'The target must be an https origin.';
		else target = parsed.origin;
	} catch {
		targetError = raw
			? `'${raw}' is not a valid origin.`
			: 'No target instance was given — open this page from the clone wizard.';
	}

	const returnTo = url.searchParams.get('return') ?? `${base}/web/clone/callback`;
	return {
		session,
		target,
		targetError,
		// A path on the target, never an absolute URL: an attacker-supplied
		// return would otherwise carry the token to a host of their choosing.
		returnTo: returnTo.startsWith('/') ? returnTo : `${base}/web/clone/callback`,
		instance: url.searchParams.get('instance') ?? ''
	};
};
