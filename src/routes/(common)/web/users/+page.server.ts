import { redirect } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { User } from '$src/lib/interfaces/v2/user';
import type { PageServerLoad } from "./$types"

export const ssr = false;

export const load: PageServerLoad = async ({ url, cookies, locals, fetch }) => {
   const session = await locals.auth();
   if (!session) {
      redirect(303, `/signin?redirect=${url.pathname}`);
   }

   let users: User[] | undefined;
   if (import.meta.env.DEV) {
      const endpointUrl = `${variables.BASE_URI}/api/v2/users`;
      try {
         const request = authReq(endpointUrl, 'GET', cookies);
         const response = await fetch(request);
         if (!response.ok) {
            console.error(`Failed to fetch users: ${response.status} ${response.statusText}`);
            throw new Error(`Response status: ${response.status}`);
         }
         users = await response.json();
         console.log(`${users?.length} users fetched +page.server.ts`);
      } catch (error: any) {
         console.error('Error retrieving users:', error.message);
      }
   }

   return {
      session: session,
      users: users
   }
}
