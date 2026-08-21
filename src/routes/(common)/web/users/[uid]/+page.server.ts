import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types"
import { base } from '$app/paths';

export const ssr = false;

export const load: PageServerLoad = async ({ url, locals }) => {
   const session = await locals.auth();
   if (!session) {
      redirect(303, `${base}/signin?redirect=${url.pathname}`);
   }
   return {
      session
   }
}
