import { ORIGIN } from '#lib/utils/origin.ts';
import { checkVersion } from '#lib/version.ts';
import { getSituationsV2 } from '#lib/store/directoryStore.ts';
import type { Entry } from '#lib/store/directoryStoreInterface.ts';
import type { Situation } from '#lib/store/directoryStoreInterface.ts';
import type { LayoutLoad } from './$types';
import { browser } from '$app/env';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
	checkVersion();
	// Re-run whenever the session changes (sign in / sign out) so role-scoped
	// data — notably which avatars the API is willing to send — is refetched
	// without the user having to reload the page. `app:entries` lets any
	// component force the same refresh via invalidate('app:entries').
	depends('app:session');
	depends('app:entries');
	// Reading the server-provided session also registers it as a dependency, so
	// an auth navigation invalidates this load automatically.
	const currentSession = data?.session ?? null;
	let response;
	console.log('layout.ts browser', browser, 'session:', currentSession ? 'yes' : 'no');
	let entries: Entry[] | undefined;
	if (browser && import.meta.env.PROD) {
		try {
			const entriesUrl = `${ORIGIN}/api/v2/entries`;
			response = await fetch(entriesUrl, {
				credentials: 'include',
				method: 'GET',
				headers: { 'content-type': 'application/json' }
			});
			if (!response.ok) {
				throw new Error(`Response status: ${response.status}`);
			}
			entries = (await response.json()) as Entry[];
			if (entries) console.log('entries layout.ts', entries[0].name);
		} catch (error: any) {
			console.error('There was an error while retrieving entries from layout.ts', error.message);
		}
	}

	let situations: Situation[] | undefined;
	if (browser && import.meta.env.PROD && data.directory?.inputField.situation) {
		situations = await getSituationsV2(fetch);
	}

	// Everything the server load returned, then what this one refetches in the
	// browser. Listed by hand, a key this load forgot never reached page.data:
	// `theme` once, then the site's sharing card.
	return {
		...data,
		situations: situations || data.situations,
		entries: entries || data.entries
	};
};
