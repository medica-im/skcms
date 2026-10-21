import { ORIGIN } from '$lib/utils/origin.ts';
import { browser } from '$app/environment';
import type { PageLoad } from './$types';
import type { Invitee } from '$src/lib/interfaces/v2/invitee';
import type { ResendJob } from '$lib/Invitee/batchResend';

const DEFAULT_RESEND_AFTER_DAYS = 30;

export const load: PageLoad = async ({ fetch, data, url }) => {
    let invitees: Invitee[] | undefined;
    let settings: { resendAfterDays: number } | undefined;
    let resendJobs: ResendJob[] | undefined;
    if (browser && import.meta.env.PROD) {
        try {
            const endpointUrl = `${ORIGIN}/api/v2/invitees`;
            const response = await fetch(endpointUrl, {
                credentials: 'include',
                method: 'GET',
                headers: { "content-type": "application/json" },
            });
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            invitees = await response.json() as Invitee[];
            console.log(`invitee(s) fetched +page.ts`, invitees);
        } catch (error: any) {
            console.error('There was an error while retrieving invitees from +page.ts', error.message);
        }
        [settings, resendJobs] = await Promise.all([
            getJson<{ resendAfterDays: number }>(`${ORIGIN}/api/v2/invitation-settings`, fetch),
            getJson<ResendJob[]>(`${ORIGIN}/api/v2/batch-invitees?kind=resend&limit=1`, fetch)
        ]);
    }
    return {
        invitees: invitees || data.invitees,
        resendAfterDays: settings?.resendAfterDays ?? data.resendAfterDays ?? DEFAULT_RESEND_AFTER_DAYS,
        latestResend: resendJobs ? (resendJobs[0] ?? null) : (data.latestResend ?? null)
    }
}

async function getJson<T>(url: string, fetch: typeof globalThis.fetch): Promise<T | undefined> {
    try {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error(`Response status: ${response.status}`);
        return await response.json();
    } catch (error: any) {
        console.error(`GET ${url}: ${error.message}`);
        return undefined;
    }
}
