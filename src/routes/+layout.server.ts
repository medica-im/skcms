import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { authReq } from '$lib/utils/request';
import type { Organization } from '$lib/interfaces/organization.ts';
import type { LayoutServerLoad } from "./$types"
import type { User } from "$lib/interfaces/user.interface";

export const load: LayoutServerLoad = async ({ locals, cookies, fetch }) => {
  let response;
  let user: User | undefined;
    const userUrl = `${ORIGIN}/api/v2/users/me`;
    const request = authReq(userUrl, "GET", cookies);
    try {
      response = await fetch(request);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      user = await response.json();
      console.log("user", user);
    } catch (error: any) {
      console.error('There was an error while retrieving user from layout.server.ts', error.message);
    }
  let organization;
  const orgUrl = `${ORIGIN}/api/v2/organization`;
  console.log("orgUrl", orgUrl);
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
    console.log("organization", organization);
  } catch (error: any) {
    console.error(`organization ${error.message}`);
  }
  return {
    user: user,
    session: await locals.auth(),
    organization: organization,
  }
}