import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { authReq } from '$lib/utils/request';
import { getEntries } from '$lib/store/directoryStore';
import type { Organization } from '$lib/interfaces/organization.ts';
import type { LayoutServerLoad } from "./$types"
import type { User } from "$lib/interfaces/user.interface";
import type { Entry } from '$lib/store/directoryStoreInterface';

export const load: LayoutServerLoad = async ({ locals, cookies, fetch }) => {
  let response;
  let user: User | undefined;
  if (import.meta.env.DEV) {
    const userUrl = `${ORIGIN}/api/v2/users/me`;
    const request = authReq(userUrl, "GET", cookies);
    try {
      response = await fetch(request);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      user = await response.json();
    } catch (error: any) {
      console.error('There was an error while retrieving user from layout.server.ts', error.message);
    }
  }
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
    console.error(`organization ${error.message}`);
  }
  let directory;
  const dirUrl = `${ORIGIN}/api/v1/directory/`;
  try {
    response = await fetch(dirUrl, {
      //credentials: 'include',
      method: 'GET',
      headers: { "content-type": "application/json" },
    })
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    directory = await response.json();
  } catch (error: any) {
    console.error(`directory ${error.message}`);
  }
  return {
    user: user,
    session: await locals.auth(),
    organization: organization,
    directory: directory,
    //entries: await getEntries() as Entry[],
  }
}