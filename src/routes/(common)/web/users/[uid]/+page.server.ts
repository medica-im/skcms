import { redirect, error } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { User, AccessHistory } from '$src/lib/interfaces/v2/user';
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
      userDetail,
      // Loaded here rather than through a remote query in the component: this
      // route sets `ssr = false`, and a query issued from a client-only page
      // never reaches the server with its argument attached — it arrives as
      // `undefined` and is refused by the schema before the handler runs. The
      // history is plain read-only data the page always shows, so fetching it
      // beside the user it belongs to costs nothing and removes the failure
      // mode entirely.
      accessHistory: await loadAccessHistory(params.uid, cookies, fetch)
   }
}

/** Every role this user has held here — the audit trail, read back. */
async function loadAccessHistory(
   uid: string,
   cookies: Parameters<PageServerLoad>[0]['cookies'],
   fetch: Parameters<PageServerLoad>[0]['fetch']
): Promise<AccessHistory[]> {
   const url = `${variables.BASE_URI}/api/v2/users/${uid}/access-history`;
   const response = await fetch(authReq(url, 'GET', cookies));
   if (!response.ok) {
      // A missing history is not a missing page: the rest of the detail view
      // is still worth showing, so this degrades to an empty section rather
      // than failing the whole route.
      console.error(
         `Failed to fetch access history: ${response.status} ${response.statusText}`
      );
      return [];
   }
   return await response.json();
}
