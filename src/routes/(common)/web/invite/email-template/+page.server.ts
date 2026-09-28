import { error, redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { PageServerLoad } from './$types';

// Who may SEE the page: administrators and higher, always. Who may change the
// template and its images is the organization's choice
// (Organization.email_template_editor_role), answered by the backend as
// `can_edit` and enforced there.
const ALLOWED_ROLES = ['administrator', 'superuser'];

export const load: PageServerLoad = async ({ url, locals, parent }) => {
	const session = await locals.auth();
	if (!session) {
		redirect(303, `${base}/signin?redirectTo=${url.pathname}`);
	}

	const { user } = await parent();
	if (!user?.role || !ALLOWED_ROLES.includes(user.role)) {
		error(403, {
			message: 'Access restricted to administrators',
			type: 'invitees-forbidden'
		});
	}

	return { session };
};
