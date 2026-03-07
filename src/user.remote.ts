import { getRequestEvent, query } from '$app/server';
import * as z from 'zod';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { User } from '$lib/interfaces/v2/user.ts';

export const getUser = query(z.string(), async (uid) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/users/${uid}`;
	const request = authReq(url, 'GET', cookies);
	const response = await fetch(request);
	if (response.ok) {
		return await response.json() as User;
	}
	console.error(`Failed to fetch user ${uid}: ${response.status} ${response.statusText}`);
});

export const getUsers = query(async () => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/users`;
	const request = authReq(url, 'GET', cookies);
	const response = await fetch(request);
	if (response.ok) {
		return await response.json() as User[];
	}
	console.error(`Failed to fetch users: ${response.status} ${response.statusText}`);
});
