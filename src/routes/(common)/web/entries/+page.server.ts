import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ url, locals }) => {
   const session = await locals.auth();
   if (!session) {
      redirect(303, `/signin?redirect=${url.pathname}`);
   }
}
