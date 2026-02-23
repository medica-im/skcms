import { redirect, error } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { User } from '$src/lib/interfaces/v2/user';
import type { PageServerLoad } from "./$types"

export const ssr = false;

export const load: PageServerLoad = async ({ url, cookies, locals, fetch, params }) => {
   const session = await locals.auth();
   if (!session) {
      redirect(303, `/signin?redirect=${url.pathname}`);
   }

   let userDetail: User | undefined;
   if (import.meta.env.DEV) {
      const { uid } = params;
      const endpointUrl = `${variables.BASE_URI}/api/v2/users/${uid}`;
      const request = authReq(endpointUrl, 'GET', cookies);
      const response = await fetch(request);
      if (!response.ok) {
         console.error(`Failed to fetch user: ${response.status} ${response.statusText}`);
         error(response.status === 404 ? 404 : 500, 'User not found');
      }
      userDetail = await response.json();
   }

   return {
      session,
      userDetail
   }
}
