import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const ssr = false;

export const load: PageServerLoad = async ({ url, locals, parent }) => {
	const session = await locals.auth();
	if (!session) {
		redirect(303, `/signin?redirect=${url.pathname}`);
	}
	const { user } = await parent();
	if (!user || 'superuser' !== user.role) {
		error(403, 'Accès réservé aux administrateurs');
	}
};
