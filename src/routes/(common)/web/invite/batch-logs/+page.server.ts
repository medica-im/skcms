import { redirect } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ url, cookies, locals, fetch }) => {
   const session = await locals.auth();
   if (!session) {
      redirect(303, `/signin?redirectTo=${url.pathname}`);
   }

   let jobs;
   if (import.meta.env.DEV) {
      try {
         const endpointUrl = `${variables.BASE_URI}/api/v2/batch-invitees`;
         const request = authReq(endpointUrl, 'GET', cookies);
         const response = await fetch(request);
         if (response.ok) {
            jobs = await response.json();
         }
      } catch (error: any) {
         console.error('Error fetching batch invitee jobs:', error.message);
      }
   }

   return { session, jobs }
}
