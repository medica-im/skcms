import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { authReq } from '$lib/utils/request';
import { getEntries } from '$lib/api.ts';
import type { Organization } from '$lib/interfaces/organization.ts';
import type { LayoutServerLoad } from "./$types"
import type { User } from "$lib/interfaces/user.interface";
import type { Entry } from '$lib/store/directoryStoreInterface';
import type { Labels } from '$lib/interfaces/label.interace.ts';
import type { Directory } from '$lib/interfaces/directory.interface.ts';

export const load: LayoutServerLoad = async ({ locals, cookies, fetch, depends }) => {
  depends('app:entries');
  let response;
  let user: User | undefined;
    const userUrl = `${ORIGIN}/api/v2/users/me`;
    const request = authReq(userUrl, "GET", cookies);
    try {
      response = await globalThis.fetch(request);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      user = await response.json();
      console.log("user layout.server.ts", user);
    } catch (error: any) {
      console.error('There was an error while retrieving user from layout.server.ts', error.message);
    }
  // here retrieving entries with auth works with http://localhost and pnpm run dev
  let entries: Entry[] | undefined = await getEntries(globalThis.fetch, cookies);

  let organization;
  const orgUrl = `${ORIGIN}/api/v2/organization`;
  try {
    response = await fetch(orgUrl, {
      credentials: 'include',
      method: 'GET',
      headers: { "content-type": "application/json" },
    })
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    organization = await response.json() as Organization;
  } catch (error: any) {
    console.error(`organization from layout.server.ts ${error.message}`);
  }

  let directory;
  const dirUrl = `${ORIGIN}/api/v1/directory/`;
  try {
    response = await fetch(dirUrl, {
      credentials: 'include',
      method: 'GET',
      headers: { "content-type": "application/json" },
    })
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    directory = await response.json() as Directory;
  } catch (error: any) {
    console.error(`directory from layout.server.ts ${error.message}`);
  }

  let labels;
  try {
    response = await fetch(`${ORIGIN}/api/v1/directory/effector_type_labels/`);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    labels = await response.json() as Labels;
  } catch (error: any) {
    console.error(`labels from layout.server.ts ${error.message}`);
  }

  return {
    user: user,
    session: await locals.auth(),
    organization: organization,
    directory: directory,
    entries: entries,
    labels: labels,
  }
}