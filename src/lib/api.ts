import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { authReq } from './utils/request';
import type { Entry } from '$lib/store/directoryStoreInterface';
import type { Fetch } from '$lib/interfaces/fetch.ts';
import type { Cookies } from '@sveltejs/kit';

export async function getEntries(fetch: Fetch, cookies: Cookies) {
    let entries: Entry[] | undefined;
        const entriesUrl = `${ORIGIN}/api/v2/entries`;
        const entriesRequest = authReq(entriesUrl, "GET", cookies);
        try {
          const response = await fetch(entriesRequest);
          if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
          }
          entries = await response.json() as Entry[];
          if (entries) console.log('entries layout.server.ts', entries[0].name);
          return entries
        } catch (error: any) {
          console.error('There was an error while retrieving entries from layout.server.ts', error.message);
        };
}