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
  } catch (error: any) {
    console.error(error.message);
  }
  let directory;
  const dirUrl = `${ORIGIN}/api/v1/directory/`;
  console.log("dirUrl", dirUrl);
  response = await fetch(dirUrl, {
    credentials: 'include',
    method: 'GET',
    headers: { "content-type": "application/json" },
  })
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