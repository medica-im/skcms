import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { authReq } from '$lib/utils/request.ts';
import type { User } from "$lib/interfaces/user.interface";
import type { Organization } from '$lib/interfaces/organization.ts';
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals, cookies, fetch }) => {
  const url = `${ORIGIN}/api/v2/users/me`;
  const request = authReq(url, 'GET', cookies);
  let response;
  let user: User | undefined;
  try {
    response = await fetch(request)
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    user = await response.json();
    console.log("user", user);
  } catch (error: any) {
    console.error('There was an error while retrieving user', error.message);
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
    session: await locals.auth(),
    user: user,
    organization: organization,
  }
}