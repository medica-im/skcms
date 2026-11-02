import { getRequestEvent, command } from '$app/server';
import * as z from 'zod';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const Uid = z.string().regex(/^[0-9a-fA-F]{32}$/);
const Time = z.string().regex(/^\d{2}:\d{2}$/);

const Schedule = z.object({
	entry: Uid,
	channel: z.enum(['on_site', 'phone', 'sms', 'online']),
	label: z.nullable(z.string().max(100)),
	holidays: z.enum(['closed', 'open']),
	days: z.record(
		z.string().regex(/^[1-7]$/),
		z.array(z.object({ opens: Time, closes: Time }))
	)
});

const outcome = async (response: Response) => {
	if (!response.ok) {
		console.error(response.status, response.statusText);
		return { success: false, status: response.status, text: response.statusText };
	}
	return { success: true, status: response.status, text: response.statusText };
};

export const createCommand = command(Schedule, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/schedules`;
	return outcome(await fetch(authReq(url, 'POST', cookies, JSON.stringify(data))));
});

export const putCommand = command(Schedule.extend({ uid: Uid }), async ({ uid, ...data }) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/schedules/${uid}`;
	return outcome(await fetch(authReq(url, 'PUT', cookies, JSON.stringify(data))));
});

export const deleteCommand = command(z.object({ uid: Uid }), async ({ uid }) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/schedules/${uid}`;
	return outcome(await fetch(authReq(url, 'DELETE', cookies)));
});
