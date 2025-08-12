import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {
 //const session = await locals.auth()
 const session = await event.locals.auth();
 console.log(`session:${JSON.stringify(session)}`);
 if (!session) {
    redirect(303, `/signin?redirectTo=${event.url.pathname}`);
 }
 return {
  session
 }
}