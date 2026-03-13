import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { PageLoad } from './$types';
import type { BatchEmailMessageDetail } from '$lib/interfaces/v2/batchEmail';
import type { User } from '$lib/interfaces/v2/user';

export const load: PageLoad = async ({ fetch, data, params }) => {
	let email: BatchEmailMessageDetail | undefined;
	let users: User[] | undefined;

	if (import.meta.env.PROD) {
		try {
			const emailRes = await fetch(`${ORIGIN}/api/v2/batch-emails/${params.id}`, {
				credentials: 'include',
				method: 'GET',
				headers: { 'content-type': 'application/json' }
			});
			if (emailRes.ok) {
				email = await emailRes.json();
			}
		} catch (err: any) {
			console.error('Error fetching batch email:', err.message);
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
		email: email || data.email,
		users: users || data.users
	};
};
