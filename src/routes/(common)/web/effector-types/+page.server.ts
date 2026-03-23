import { redirect } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { EffectorType } from '$lib/interfaces/v2/effector';
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ url, cookies, locals, fetch }) => {
   const session = await locals.auth();
   if (!session) {
      redirect(303, `/signin?redirect=${url.pathname}`);
   }

   let effectorTypes: EffectorType[] | undefined;
   if (import.meta.env.DEV) {
      try {
         const endpointUrl = `${variables.BASE_URI}/api/v2/effector-types`;
         const request = authReq(endpointUrl, 'GET', cookies);
         const response = await fetch(request);
         if (!response.ok) {
            console.error(`Failed to fetch effector types: ${response.status} ${response.statusText}`);
            throw new Error(`Response status: ${response.status}`);
         }
         effectorTypes = await response.json();
      } catch (error: any) {
         console.error('Error retrieving effector types:', error.message);
      }
   }

   return {
      session,
      effectorTypes,
   }
}
