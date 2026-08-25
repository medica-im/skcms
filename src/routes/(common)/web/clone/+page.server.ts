import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { PageServerLoad } from './$types';

/** Signed in, or nowhere. The backend is the real gate; this is the front door. */
export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.auth();
	if (!session) redirect(303, `${base}/signin?redirect=${url.pathname}`);
	return { session };
};
