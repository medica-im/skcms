import { error, redirect } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { BatchEmailMessageDetail } from '$lib/interfaces/v2/batchEmail';
import type { User } from '$lib/interfaces/v2/user';
import type { PageServerLoad } from './$types';

export const ssr = false;

export const load: PageServerLoad = async ({ url, cookies, locals, fetch, parent, params }) => {
	const session = await locals.auth();
	if (!session) {
		redirect(303, `/signin?redirect=${url.pathname}`);
	}
	const { user } = await parent();
	if (!user || 'superuser' !== user.role) {
		error(403, 'Accès réservé aux super-utilisateurs');
	}

	let email: BatchEmailMessageDetail | undefined;
	let users: User[] | undefined;

	if (import.meta.env.DEV) {
		try {
			const emailUrl = `${variables.BASE_URI}/api/v2/batch-emails/${params.id}`;
			const emailReq = authReq(emailUrl, 'GET', cookies);
			const emailRes = await fetch(emailReq);
			if (!emailRes.ok) {
				console.error(`Failed to fetch batch email: ${emailRes.status} ${emailRes.statusText}`);
				error(emailRes.status, emailRes.statusText);
			}
			email = await emailRes.json();
		} catch (err: any) {
			if (err.status) throw err;
			console.error('Error retrieving batch email:', err.message);
		}

		try {
			const usersUrl = `${variables.BASE_URI}/api/v2/users`;
			const usersReq = authReq(usersUrl, 'GET', cookies);
			const usersRes = await fetch(usersReq);
			if (usersRes.ok) {
				users = await usersRes.json();
			}
		} catch (err: any) {
			console.error('Error retrieving users:', err.message);
		}
	}

	return {
		session,
		email,
		users
	};
};
