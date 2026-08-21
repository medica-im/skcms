import { redirect } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { PageServerLoad } from "./$types"
import { base } from '$app/paths';

export const load: PageServerLoad = async ({ url, cookies, locals, fetch, params }) => {
   const session = await locals.auth();
   if (!session) {
      redirect(303, `${base}/signin?redirectTo=${url.pathname}`);
   }

   let job;
   if (import.meta.env.DEV) {
      try {
         const endpointUrl = `${variables.BASE_URI}/api/v2/batch-invitees/${params.uid}`;
         const request = authReq(endpointUrl, 'GET', cookies);
         const response = await fetch(request);
         if (response.ok) {
            job = await response.json();
         }
      } catch (error: any) {
         console.error('Error fetching batch invitee job:', error.message);
      }
   }

   return { session, job }
}
