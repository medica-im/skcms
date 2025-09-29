import { variables } from "$lib/utils/constants";
import type { User } from "$lib/interfaces/user.interface";
import type { LayoutServerLoad } from "./$types"

const directory = async (fetch: any) => {
  const url = `${variables.BASE_URI}/api/v1/directory/`;
  let response;
  try {
      response = await fetch(url)
  } catch (error)  {
  console.log('directory fetch error', error);
  }
  if (response?.ok) {
    return await response.json();
  //console.log(`Use the response here: ${JSON.stringify(user)}`);
} else {
  console.log(`HTTP Response Code: ${response?.status}`)
}
}

export const load: LayoutServerLoad = async ({locals, cookies, fetch}) => {
  const url = `${variables.BASE_URI}/api/v2/users/me`;
          let request = new Request(url,
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
  console.log(`HTTP Response Code: ${response?.status}`)
}
  return {
    session: await locals.auth(),
    user: user,
    directory: await directory(fetch)
  }
}