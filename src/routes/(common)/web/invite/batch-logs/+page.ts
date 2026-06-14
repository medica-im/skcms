import { ORIGIN } from '$lib/utils/origin.ts';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';

export interface BatchInviteeJob {
    uid: string;
    created_at: string;
    status: string;
    total_rows: number;
    successful_count: number;
    failed_count: number;
    skipped_duplicate_email_count: number;
    skipped_active_user_count: number;
    failed_email_count: number;
    role: string;
}

export const load: PageLoad = async ({ fetch, data }) => {
    let jobs: BatchInviteeJob[] | undefined;

    if (browser && import.meta.env.PROD) {
        try {
            const response = await fetch(`${ORIGIN}/api/v2/batch-invitees`, {
                credentials: 'include',
                method: 'GET',
                headers: { 'content-type': 'application/json' },
            });
            if (response.ok) {
                jobs = await response.json();
            }
        } catch (error: any) {
            console.error('Error fetching batch invitee jobs:', error.message);
        }
    }

    return {
        session: data.session,
        jobs: jobs || data.jobs || []
    };
}
