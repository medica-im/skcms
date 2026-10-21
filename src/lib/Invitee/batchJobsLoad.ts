/**
 * Loading a batch history: the imports' or the reminders', one page each.
 *
 * As the other invitation pages load: on the server in DEV, in the browser in
 * PROD (the SSR fetch comes back empty on staging), the browser's answer
 * winning when there is one.
 */
import { redirect, type Cookies } from '@sveltejs/kit';
import { base } from '$app/paths';
import { browser } from '$app/environment';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import { APP_URL } from '$lib/utils/appUrl';
import type { BatchKind } from './batchJobStatus';

export interface BatchJobListItem {
	uid: string;
	created_at: string;
	status: string;
	kind: BatchKind;
	total_rows: number;
	successful_count: number;
	failed_count: number;
	skipped_duplicate_email_count: number;
	skipped_active_user_count: number;
	failed_email_count: number;
	role: string;
	phase: 'creating' | 'sending';
	emails_total: number;
	emails_processed: number;
	email_skipped_count: number;
}

const path = (kind: BatchKind) => `/api/v2/batch-invitees?kind=${kind}`;

export function serverLoadJobs(kind: BatchKind) {
	return async ({ url, cookies, locals, fetch }: {
		url: URL;
		cookies: Cookies;
		locals: App.Locals;
		fetch: typeof globalThis.fetch;
	}) => {
		const session = await locals.auth();
		if (!session) {
			redirect(303, `${base}/signin?redirectTo=${url.pathname}`);
		}

		let jobs: BatchJobListItem[] | undefined;
		if (import.meta.env.DEV) {
			try {
				const response = await fetch(authReq(`${variables.BASE_URI}${path(kind)}`, 'GET', cookies));
				if (response.ok) jobs = await response.json();
			} catch (error: any) {
				console.error('Error fetching batch invitee jobs:', error.message);
			}
		}
		return { session, jobs };
	};
}

export function universalLoadJobs(kind: BatchKind) {
	return async ({ fetch, data }: {
		fetch: typeof globalThis.fetch;
		data: { session: unknown; jobs?: BatchJobListItem[] };
	}) => {
		let jobs: BatchJobListItem[] | undefined;
		if (browser && import.meta.env.PROD) {
			try {
				const response = await fetch(`${APP_URL}${path(kind)}`, { credentials: 'include' });
				if (response.ok) jobs = await response.json();
			} catch (error: any) {
				console.error('Error fetching batch invitee jobs:', error.message);
			}
		}
		return { session: data.session, jobs: jobs || data.jobs || [] };
	};
}
