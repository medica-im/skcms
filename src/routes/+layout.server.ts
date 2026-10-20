import { ORIGIN } from '$lib/utils/origin.ts';
import { authReq } from '$lib/utils/request';
import { getEntries } from '$lib/api.ts';
import { getSituationsV2 } from '$lib/store/directoryStore';
import { DISMISSED_COOKIE, parseDismissed } from '$lib/Alert/dismissed';
import type { Organization } from '$lib/interfaces/organization.ts';
import type { LayoutServerLoad } from "./$types"
import type { User } from "$lib/interfaces/user.interface";
import type { Labels } from '$lib/interfaces/label.interace.ts';
import type { Directory } from '$lib/interfaces/directory.interface.ts';

export const load: LayoutServerLoad = async ({ locals, cookies, fetch, depends }) => {
  depends('app:entries');

  const getUser = async (): Promise<User | undefined> => {
    try {
      const response = await globalThis.fetch(authReq(`${ORIGIN}/api/v2/users/me`, "GET", cookies));
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const user = await response.json();
      console.log("user layout.server.ts", user);
      return user;
    } catch (error: any) {
      console.error('There was an error while retrieving user from layout.server.ts', error.message);
    }
  };

  const getJson = async <T>(url: string, what: string): Promise<T | undefined> => {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        method: 'GET',
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      return await response.json() as T;
    } catch (error: any) {
      console.error(`${what} from layout.server.ts ${error.message}`);
    }
  };

  const directoryAndSituations = getJson<Directory>(`${ORIGIN}/api/v1/directory/`, 'directory').then(async (directory) => ({
    directory,
    // globalThis.fetch, not SvelteKit's event fetch, for the same reason as
    // entries below: the event fetch's same-origin check compares against the
    // scheme Vite itself sees, which does not account for TLS terminated by a
    // proxy in front of it.
    situations: directory?.inputField.situation ? await getSituationsV2(globalThis.fetch) : undefined,
  }));

  const [user, entries, organization, { directory, situations }, labels, session] = await Promise.all([
    getUser(),
    // here retrieving entries with auth works with http://localhost and pnpm run dev
    getEntries(globalThis.fetch, cookies),
    getJson<Organization>(`${ORIGIN}/api/v2/organization`, 'organization'),
    directoryAndSituations,
    getJson<Labels>(`${ORIGIN}/api/v2/effector-type-labels`, 'labels'),
    locals.auth(),
  ]);

  return {
    user: user,
    session: session,
    organization: organization,
    directory: directory,
    entries: entries,
    labels: labels,
    situations: situations,
    dismissedAlerts: parseDismissed(cookies.get(DISMISSED_COOKIE)),
    // What the page was actually rendered with, so the theme switcher can
    // start on it. The `theme` cookie is HttpOnly and unreadable from the
    // browser, which is why this has to travel in the payload.
    theme: locals.theme,
  }
}
