import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { checkVersion } from '$lib/version';
import { getEntries, getSituations } from '$lib/store/directoryStore';
import type { User } from "$lib/interfaces/user.interface";
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch, data }) => {
  checkVersion();
  let response;
  const userUrl = `${ORIGIN}/api/v2/users/me`;
  let user: User | undefined;
  try {
    response = await fetch(userUrl, {
      credentials: 'include',
      method: 'GET',
      headers: { "content-type": "application/json" },
    })
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    user = await response.json();
    console.log("user", user);
  } catch (error: any) {
    console.error('There was an error while retrieving user from layout.ts', error.message);
  }

  let directory;
  const dirUrl = `${ORIGIN}/api/v1/directory/`;
  console.log("dirUrl", dirUrl);
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
    console.log("directory", directory);
  } catch (error: any) {
    console.error(`directory ${error.message}`);
  }

  return {
    directory: directory,
    session: data.session,
    user: data.user||user,
    organization: data.organization,
    entries: await getEntries(),
    situations: await getSituations(),
    sections: [
      { slug: 'profile', title: 'Profile' },
      { slug: 'notifications', title: 'Notifications' }
    ]
  };
}