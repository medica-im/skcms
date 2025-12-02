import { variables } from "$lib/utils/constants";
import type { User } from "$lib/interfaces/user.interface";
import type { Organization } from '$lib/interfaces/organization.ts';
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({locals, cookies, fetch}) => {
          let request = new Request(`${variables.BASE_URI}/api/v2/users/me`,
              {   credentials: 'include',
                  method: 'GET',
                  headers: { "content-type": "application/json" },
              }
          );
          request.headers.set(
              'cookie',
              cookies
                  .getAll()
                  .filter(({ value }) => value !== '')
                  .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
                  .join('; ')
          );
  let response;
  let user: User|undefined;
  try {
  response = await fetch(request)
  } catch (error)  {
  console.log('There was an error', error);
  }
  if (response?.ok) {
    user = await response.json();
  //console.log(`Use the response here: ${JSON.stringify(user)}`);
} else {
  console.log(`/api/v2/users/me HTTP Response Code: ${response?.status}`)
}
const url = `${variables.BASE_URI}/api/v1/organization/`;
  console.log(url);
  let organization
  try {
    response = await fetch(url)
  } catch (error) {
    console.error('organization fetch', error);
    throw error
  }
  if (response.ok) {
    organization = await response.json() as Organization;
  } else {
    console.error(`organization fetch HTTP Response Code: ${response?.status}`)
    throw new Error(`organization fetch status: ${response.status}`)
  }

  return {
    session: await locals.auth(),
    user: user,
    organization: organization
  }
}