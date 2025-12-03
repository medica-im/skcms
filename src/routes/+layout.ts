import { variables } from "$lib/utils/constants";
import { checkVersion } from '$lib/version';
import type { LayoutLoad } from './$types';


export const load: LayoutLoad = async ({ fetch, parent, data }) => {
  checkVersion();
  return {
    directory: data.directory,
    session: data.session,
    user: data.user,
    organization: data.organization,
    sections: [
      { slug: 'profile', title: 'Profile' },
      { slug: 'notifications', title: 'Notifications' }
    ]
  };
}