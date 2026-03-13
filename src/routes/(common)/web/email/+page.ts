import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { PageLoad } from './$types';
import type { BatchEmailMessage } from '$lib/interfaces/v2/batchEmail';
import type { User } from '$lib/interfaces/v2/user';

export const load: PageLoad = async ({ fetch, data }) => {
	let emails: BatchEmailMessage[] | undefined;
	let users: User[] | undefined;

	if (import.meta.env.PROD) {
		try {
			const emailsRes = await fetch(`${ORIGIN}/api/v2/batch-emails`, {
				credentials: 'include',
				method: 'GET',
				headers: { 'content-type': 'application/json' }
			});
			if (emailsRes.ok) {
				emails = await emailsRes.json();
			}
		} catch (err: any) {
			console.error('Error fetching batch emails:', err.message);
		}

		try {
			const usersRes = await fetch(`${ORIGIN}/api/v2/users`, {
				credentials: 'include',
				method: 'GET',
				headers: { 'content-type': 'application/json' }
			});
			if (usersRes.ok) {
				users = await usersRes.json();
			}
		} catch (err: any) {
			console.error('Error fetching users:', err.message);
		}
	}

	return {
		emails: emails || data.emails,
		users: users || data.users
	};
};
