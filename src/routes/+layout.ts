import { organizationStore } from '$lib/store/facilityStore.ts';
import { checkVersion } from '$lib/version';
import type { LayoutLoad } from './$types';

/** @type {import('./$types').LayoutLoad} */

export const load: LayoutLoad<{}> = async ({ fetch, parent, data }) => {
  checkVersion();
  console.log(`data.directory: ${JSON.stringify(data.directory)}`);
  return {
    directory: data.directory,
    session: data.session,
    user: data.user,
    organization: await organizationStore.load(),
    sections: [
      { slug: 'profile', title: 'Profile' },
      { slug: 'notifications', title: 'Notifications' }
    ]
  };
}