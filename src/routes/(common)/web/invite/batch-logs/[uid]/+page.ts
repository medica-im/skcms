import { ORIGIN } from '$lib/utils/origin.ts';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';

export interface BatchInviteeJobDetail {
    uid: string;
    status: string;
    total_rows: number;
    processed_rows: number;
    successful_count: number;
    failed_count: number;
    skipped_duplicate_email_count: number;
    skipped_active_user_count: number;
    failed_email_count: number;
    percentage: number;
    summary: any[];
    created_at: string;
    role: string;
    send_emails: boolean;
}

export const load: PageLoad = async ({ fetch, data, params }) => {
    let job: BatchInviteeJobDetail | undefined;

    if (browser && import.meta.env.PROD) {
        try {
            const response = await fetch(`${ORIGIN}/api/v2/batch-invitees/${params.uid}`, {
                credentials: 'include',
                method: 'GET',
                headers: { 'content-type': 'application/json' },
            });
            if (response.ok) {
                job = await response.json();
            }
        } catch (error: any) {
            console.error('Error fetching batch invitee job:', error.message);
        }
    }

    return {
        session: data.session,
        job: job || data.job
    };
}
