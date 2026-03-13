import { error, redirect } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { BatchEmailMessage } from '$lib/interfaces/v2/batchEmail';
import type { User } from '$lib/interfaces/v2/user';
import type { PageServerLoad } from './$types';

export const ssr = false;

export const load: PageServerLoad = async ({ url, cookies, locals, fetch, parent }) => {
	const session = await locals.auth();
	if (!session) {
		redirect(303, `/signin?redirect=${url.pathname}`);
	}
	const { user } = await parent();
	if (!user || 'superuser' !== user.role) {
		error(403, 'Accès réservé aux super-utilisateurs');
	}

	let emails: BatchEmailMessage[] | undefined;
	let users: User[] | undefined;

	if (import.meta.env.DEV) {
		try {
			const emailsUrl = `${variables.BASE_URI}/api/v2/batch-emails`;
			const emailsReq = authReq(emailsUrl, 'GET', cookies);
			const emailsRes = await fetch(emailsReq);
			if (!emailsRes.ok) {
				console.error(`Failed to fetch batch emails: ${emailsRes.status} ${emailsRes.statusText}`);
			} else {
				emails = await emailsRes.json();
			}
		} catch (err: any) {
			console.error('Error retrieving batch emails:', err.message);
		}

		try {
			const usersUrl = `${variables.BASE_URI}/api/v2/users`;
			const usersReq = authReq(usersUrl, 'GET', cookies);
			const usersRes = await fetch(usersReq);
			if (!usersRes.ok) {
				console.error(`Failed to fetch users: ${usersRes.status} ${usersRes.statusText}`);
			} else {
				users = await usersRes.json();
			}
		} catch (err: any) {
			console.error('Error retrieving users:', err.message);
		}
	}

	return {
		session,
		emails,
		users
	};
};
