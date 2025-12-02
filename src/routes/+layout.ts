import { variables } from "$lib/utils/constants";
import { checkVersion } from '$lib/version';
import type { Organization } from '$lib/interfaces/organization.ts';
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

export const load: LayoutLoad = async ({ fetch, parent, data }) => {
  checkVersion();
  const url = `${variables.BASE_URI}/api/v1/organization/`;
  console.log(url);
  let response;
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
    directory: await directory(fetch),
    session: data.session,
    user: data.user,
    organization: organization,
    sections: [
      { slug: 'profile', title: 'Profile' },
      { slug: 'notifications', title: 'Notifications' }
    ]
  };
}