import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolve } from '$app/paths';

export const ssr = false;

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session) {
		redirect(303, resolve(`signin?redirectTo=${event.url.pathname}`));
	}
	return {
		session
	};
};
