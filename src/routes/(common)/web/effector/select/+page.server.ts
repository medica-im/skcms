import { redirect } from '@sveltejs/kit';
import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import { authReq } from '$lib/utils/request';
import type { User } from '$src/lib/interfaces/user.interface';
import type { Effector } from '$src/lib/interfaces/v2/effector';
import type { PageServerLoad } from "./$types"

export const ssr = false;

function getUrl(user: User, directoryName: string) {
    if ( user?.role === 'superuser' ) {
        return `${ORIGIN}/api/v2/superuser-effectors`
    } else if ( user?.role === 'administrator' ) {
        return `${ORIGIN}/api/v2/administrator-effectors`
    } else if ( user?.role === 'staff') {
        return `${ORIGIN}/api/v2/staff-effectors`
    } else {
        throw new Error("role is not authorized")
    }
}

export const load: PageServerLoad = async ({ fetch, locals, params, cookies, parent, depends, url }) => {
   const session = await locals.auth();
   if (!session) {
      redirect(303, `/signin?redirect=${url.pathname}`);
   }
   const { user } = await parent();
   if (user === undefined) throw new Error("user undefined")
   const { organization } = await parent();
   if (organization === undefined) throw new Error("organization undefined")
   const { directory } = await parent();
   if (directory === undefined) throw new Error("directory undefined")
   const directoryName = directory?.name;
   const effectorsUrl = getUrl(user, directoryName);
   console.log("/src/routes/(common)/web/effector/select/+page.server.ts url", effectorsUrl);
   const request = authReq(effectorsUrl, "GET", cookies);

   const response = await globalThis.fetch(request);
   let effectors;
   if (response.ok == false) {
      console.error(response.status)
      console.error(response.statusText)
      throw Error(`${response.status} ${response.text}`)
   } else {
      effectors = await response.json() as Effector[];
      console.log(`web/entry/+page.ts: ${JSON.stringify(effectors)}`)
   }
   return {
      effectors: effectors,
      user: user,
      session: session
   }
}