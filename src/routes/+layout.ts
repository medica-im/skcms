import { ORIGIN } from '$lib/utils/origin.ts';
import { checkVersion } from '$lib/version';
import { getSituationsV2 } from '$lib/store/directoryStore';
import type { User } from "$lib/interfaces/user.interface";
import type { Entry } from '$lib/store/directoryStoreInterface';
import type { Situation } from '$lib/store/directoryStoreInterface.ts';
import type { LayoutLoad } from './$types';
import { browser } from "$app/environment"

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
  let user: User | undefined;
  console.log("layout.ts browser", browser, "session:", currentSession ? 'yes' : 'no');
    if ( browser && import.meta.env.PROD ) {
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
  let entries: Entry[] | undefined;
  if ( browser && import.meta.env.PROD ) {
    try {
      const entriesUrl = `${ORIGIN}/api/v2/entries`;
      response = await fetch(entriesUrl, {
        credentials: 'include',
        method: 'GET',
        headers: { "content-type": "application/json" },
      })
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      entries = await response.json() as Entry[];
      if (entries) console.log('entries layout.ts', entries[0].name);
    } catch (error: any) {
      console.error('There was an error while retrieving entries from layout.ts', error.message);
    }
  }

  let situations: Situation[] | undefined;
  if ( browser && import.meta.env.PROD && data.directory?.inputField.situation ) {
    situations = await getSituationsV2(fetch);
  }

  return {
    situations: situations || data.situations,
    directory: data.directory,
    session: data.session,
    user: user || data.user,
    organization: data.organization,
    entries: entries || data.entries,
    labels: data.labels,
  };
}