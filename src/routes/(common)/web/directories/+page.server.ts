import { error, redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { PageServerLoad } from './$types';

// Superusers and administrators: administrators set the categories a directory
// offers; the owner switch on the same page stays superusers'. The backend
// refuses everyone else too (hard-coded role lists in
// api/routers/directories.py); this guard spares them a broken page.
const ROLES = ['superuser', 'administrator'];

export const load: PageServerLoad = async ({ url, locals, parent }) => {
	const session = await locals.auth();
	if (!session) {
		redirect(303, `${base}/signin?redirectTo=${url.pathname}`);
	}

	const { user } = await parent();
	if (!ROLES.includes(user?.role ?? '')) {
		error(403, 'Access restricted to superusers and administrators');
	}

	return { session };
};
