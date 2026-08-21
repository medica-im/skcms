import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types"
import { base } from '$app/paths';

export const load: PageServerLoad = async (event) => {

   const session = await event.locals.auth();
   if (!session) {
      redirect(303, `${base}/signin?redirectTo=${event.url.pathname}`);
   }
   return { session }
}
