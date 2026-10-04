import { error, redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { PageServerLoad } from './$types';

// Superusers only. The backend refuses everyone else too (a hard-coded role
// list in api/routers/directories.py); this guard spares them a broken page.
export const load: PageServerLoad = async ({ url, locals, parent }) => {
	const session = await locals.auth();
	if (!session) {
		redirect(303, `${base}/signin?redirectTo=${url.pathname}`);
	}

	const { user } = await parent();
	if (user?.role !== 'superuser') {
		error(403, 'Access restricted to superusers');
	}

	return { session };
};
