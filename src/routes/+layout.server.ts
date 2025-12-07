import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { Organization } from '$lib/interfaces/organization.ts';
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals, fetch }) => {
  let response;
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
    organization: organization,
  }
}