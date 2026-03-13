import { getRequestEvent, form } from '$app/server';
import * as z from 'zod';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';

const BatchEmailPost = z.object({
	recipient_uids: z.preprocess((val: string) => val.split(','), z.array(z.string())),
	subject: z.string(),
	body: z.string(),
	author_uid: z.string(),
});

export const sendBatchEmail = form(BatchEmailPost, async (data) => {
	const { cookies } = getRequestEvent();
	const url = `${variables.BASE_URI}/api/v2/batch-emails`;
	const request = authReq(url, 'POST', cookies, JSON.stringify(data));
	const response = await fetch(request);
	if (!response.ok) {
		console.error(`Batch email failed: ${response.status} ${response.statusText}`);
		return {
			success: false,
			status: response.status,
			text: response.statusText
		};
	}
	const json = await response.json();
	return {
		success: true,
		status: response.status,
		text: response.statusText,
		data: json
	};
});
