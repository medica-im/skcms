import { variables } from "$lib/utils/constants";
import { checkVersion } from '$lib/version';
import type { LayoutLoad } from './$types';

const directory = async (fetch: any) => {
  const url = `${variables.BASE_URI}/api/v1/directory/`;
  let response;
  try {
    response = await fetch(url)
  } catch (error) {
    console.log('directory fetch', error);
  }
  if (response?.ok) {
    return await response.json();
  } else {
    console.log(`directory fetch HTTP Response Code: ${response?.status}`)
  }
}

const organization = async (fetch: any) => {
  const url = `${variables.BASE_URI}/api/v1/organization/`;
  let response;
  try {
    response = await fetch(url)
  } catch (error) {
    console.log('organization fetch', error);
  }
  if (response?.ok) {
    return await response.json();
  } else {
    console.log(`organization fetch HTTP Response Code: ${response?.status}`)
  }
}

export const load: LayoutLoad = async ({ fetch, parent, data }) => {
  checkVersion();
  return {
    directory: await directory(fetch),
    session: data.session,
    user: data.user,
    organization: await organization(fetch),
    sections: [
      { slug: 'profile', title: 'Profile' },
      { slug: 'notifications', title: 'Notifications' }
    ]
  };
}