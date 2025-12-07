import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { checkVersion } from '$lib/version';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch, parent, data }) => {
  checkVersion();
  let response;
  let directory;
  const dirUrl = `${ORIGIN}/api/v1/directory/`;
  console.log("dirUrl", dirUrl);
  try {
    response = await fetch(dirUrl, {
      credentials: 'include',
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
    user: data.user,
    organization: data.organization,
    sections: [
      { slug: 'profile', title: 'Profile' },
      { slug: 'notifications', title: 'Notifications' }
    ]
  };
}