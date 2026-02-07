import { redirect } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { Invitee } from '$src/lib/interfaces/v2/invitee';
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ url, cookies, locals, fetch }) => {
   const session = await locals.auth();
   if (!session) {
      redirect(303, `/signin?redirect=${url.pathname}`);
   }

   let invitees: Invitee[] | undefined;
   // Use backend API URL directly for server-side requests
   const endpointUrl = `${variables.BASE_URI}/api/v2/invitees`;

   // Debug: log available cookies
   const allCookies = cookies.getAll();
   console.log('Available cookies:', allCookies.map(c => c.name));
   const authCookies = allCookies.filter(({ name }) =>
      name.includes('auth') || name.includes('session')
   );
   console.log('Auth cookies:', authCookies);

   try {
      const request = authReq(endpointUrl, 'GET', cookies);
      console.log('Request URL:', request.url);
      console.log('Request cookie header:', request.headers.get('cookie'));

      const response = await fetch(request);

      if (!response.ok) {
         console.error(`Failed to fetch invitees: ${response.status} ${response.statusText}`);
         throw new Error(`Response status: ${response.status}`);
      }

      invitees = await response.json();
      console.log('invitees loaded:', invitees);
   } catch (error: any) {
      console.error('Error retrieving invitees:', error.message);
   }

   return {
      session: session,
      invitees: invitees
   }
}