import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolve } from '$app/paths';

export const ssr = false;

export const load: PageServerLoad = async ({ url, locals }) => {
	const session = await locals.auth();
	if (!session) {
		redirect(303, resolve(`signin?redirectTo=${url.pathname}`));
	}
	return {
		session
	};
};
