import { redirect, error } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { Invitee } from '$src/lib/interfaces/v2/invitee';
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ url, cookies, locals, fetch, params }) => {
   const session = await locals.auth();
   if (!session) {
      redirect(303, `/signin?redirect=${url.pathname}`);
   }
   let invitee: Invitee | undefined;
   if (import.meta.env.DEV) {
      const { uid } = params;
      const endpointUrl = `${variables.BASE_URI}/api/v2/invitees/${uid}`;
      const request = authReq(endpointUrl, 'GET', cookies);
      const response = await fetch(request);
      if (!response.ok) {
         console.error(`Failed to fetch invitee: ${response.status} ${response.statusText}`);
         error(response.status === 404 ? 404 : 500, 'Invitee not found');
      }
      invitee = await response.json();
   }
   return {
      session,
      invitee
   }
}
