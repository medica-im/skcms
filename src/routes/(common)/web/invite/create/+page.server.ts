import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types"
import { createInvitee } from '$src/invitee.remote';

export const ssr = false;

export const load: PageServerLoad = async (event) => {
   const session = await event.locals.auth();
   if (!session) {
      redirect(303, `/signin?redirectTo=${event.url.pathname}`);
   }
}

export const actions = {
	createInvitee
};
