import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { User } from "$lib/interfaces/user.interface";
import type { Organization } from '$lib/interfaces/organization.ts';
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals, cookies, fetch }) => {
  let request = new Request(`${ORIGIN}/api/v2/users/me`,
    {
      credentials: 'include',
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
  let user: User | undefined;
  try {
    response = await fetch(request)
  } catch (error) {
    console.log('There was an error', error);
  }
  if (response?.ok) {
    user = await response.json();
    //console.log(`Use the response here: ${JSON.stringify(user)}`);
  } else {
    console.log(`/api/v2/users/me HTTP Response Code: ${response?.status}`)
  }
  let organization;
  response = await fetch(`${ORIGIN}/api/v1/organization`)
  if (response.ok) {
    organization = await response.json() as Organization;
  } else {
    console.error(`organization fetch HTTP Response Code: ${response?.status}`)
  }
  let directory;
  response = await fetch(`${ORIGIN}/api/v1/directory`)
  if (response.ok) {
    directory = await response.json();
  } else {
    console.error(`directory fetch HTTP Response Code: ${response?.status}`)
  }

  return {
    session: await locals.auth(),
    user: user,
    organization: organization,
    directory: directory
  }
}