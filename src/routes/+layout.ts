import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { checkVersion } from '$lib/version';
import { getSituations } from '$lib/store/directoryStore';
import type { User } from "$lib/interfaces/user.interface";
import type { Entry } from '$lib/store/directoryStoreInterface';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch, data }) => {
  checkVersion();
  let response;
  let user: User | undefined;
  let entries: Entry[] | undefined;
  if (import.meta.env.PROD) {
    const userUrl = `${ORIGIN}/api/v2/users/me`;
    try {
      response = await fetch(userUrl, {
        credentials: 'include',
        method: 'GET',
        headers: { "content-type": "application/json" },
      })
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      user = await response.json();
      console.log("user layout.ts", user);
    } catch (error: any) {
      console.error('There was an error while retrieving user from layout.ts', error.message);
    }
  }
  if (import.meta.env.PROD) {
    try {
      response = await fetch(`${ORIGIN}/api/v2/entries`, {
        credentials: 'include',
        method: 'GET',
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      entries = await response.json();
      if (entries) console.log('entries layout.ts', entries[0]);
    } catch (error: any) {
      console.error('There was an error while retrieving entries from layout.server.ts', error.message);
    }
  }

  return {
    situations: await getSituations(),
    directory: data.directory,
    session: data.session,
    user: data.user || user,
    organization: data.organization,
    entries: data.entries || entries,
  };
}