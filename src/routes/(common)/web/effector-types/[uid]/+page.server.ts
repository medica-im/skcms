import { redirect, error } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { EffectorType } from '$lib/interfaces/v2/effector';
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ url, cookies, locals, fetch, params }) => {
   const session = await locals.auth();
   if (!session) {
      redirect(303, `/signin?redirect=${url.pathname}`);
   }

   const endpointUrl = `${variables.BASE_URI}/api/v2/effector-types/${params.uid}`;
   const request = authReq(endpointUrl, 'GET', cookies);
   const response = await fetch(request);
   if (!response.ok) {
      console.error(`Failed to fetch effector type: ${response.status} ${response.statusText}`);
      error(response.status, { message: 'Une erreur est survenue.', code: response.status });
   }
   const effectorType: EffectorType = await response.json();

   let effectorTypes: EffectorType[] | undefined;
   try {
      const listUrl = `${variables.BASE_URI}/api/v2/effector-types`;
      const listRequest = authReq(listUrl, 'GET', cookies);
      const listResponse = await fetch(listRequest);
      if (listResponse.ok) {
         effectorTypes = await listResponse.json();
      }
   } catch (error: any) {
      console.error('Error retrieving effector types:', error.message);
   }

   return {
      session,
      effectorType,
      effectorTypes,
   }
}
