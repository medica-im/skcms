import { error, redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { PageServerLoad } from './$types';

// Changing the organization's invitation settings is a superuser's decision;
// the backend refuses anyone else too.
export const load: PageServerLoad = async ({ url, locals, parent, cookies, fetch }) => {
	const session = await locals.auth();
	if (!session) {
		redirect(303, `${base}/signin?redirectTo=${url.pathname}`);
	}

	const { user } = await parent();
	if (user?.role !== 'superuser') {
		error(403, {
			message: 'Access restricted to superusers',
			type: 'invitees-forbidden'
		});
	}

	const endpoint = `${variables.BASE_URI}/api/v2/invitation-settings`;
	const response = await fetch(authReq(endpoint, 'GET', cookies));
	if (!response.ok) {
		error(response.status, { message: `GET ${endpoint}: ${response.status}` });
	}
	const settings: { resendAfterDays: number } = await response.json();

	return { session, resendAfterDays: settings.resendAfterDays };
};
