import { error, redirect } from '@sveltejs/kit';
import { ORIGIN } from '$lib/utils/origin.ts';
import { authReq } from '$lib/utils/request';
import type { User } from '$src/lib/interfaces/user.interface';
import type { Effector } from '$src/lib/interfaces/v2/effector';
import type { PageServerLoad } from "./$types"

export const ssr = false;

function getUrl(user: User, directoryName: string) {
   const url = `${ORIGIN}/api/v2`;
   if (user?.role === 'superuser') {
      return `${url}/effectors`
   } else if (user?.role === 'administrator') {
      return `${url}/administrator-effectors`
   } else if (user?.role === 'staff') {
      return `${url}/staff-effectors`
   } else {
      error(403, "role is not authorized")
   }
}

export const load: PageServerLoad = async ({ fetch, locals, params, cookies, parent, depends, url }) => {
   const session = await locals.auth();
   if (!session) {
      redirect(303, `/signin?redirect=${url.pathname}`);
   }
   const { user } = await parent();
   if (user === undefined) error(403, "Utilisateur inconnu")
   const { organization } = await parent();
   if (organization === undefined) error(500, "Organisation non disponible")
   const { directory } = await parent();
   if (directory === undefined) error(500, "Annuaire non disponible")
   const directoryName = directory?.name;
   const effectorsUrl = getUrl(user, directoryName);
   console.log("src/routes/(common)/web/entry/+page.server.ts url", effectorsUrl);
   const request = authReq(effectorsUrl, "GET", cookies);

   const response = await globalThis.fetch(request);
   let effectors;
   if (response.ok == false) {
      console.error(response.status)
      console.error(response.statusText)
      error(response.status, response.statusText)
   } else {
      effectors = await response.json() as Effector[];
   }
   return {
      effectors: effectors,
      user: user,
      session: session
   }
}