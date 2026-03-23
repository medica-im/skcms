import { variables } from '$lib/utils/constants.ts';
import { error } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request';
import type { EntryFull } from '$lib/store/directoryStoreInterface';
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, params, cookies, parent, depends, url }) => {
   depends('entry:now');
   const { entries } = await parent();
   if (entries === undefined) throw new Error("entries undefined")
   const fullentryUrl = `${variables.BASE_URI}/api/v2/fullentries/slug/${params.slug}`;
   const request = authReq(fullentryUrl, "GET", cookies);
   const res = await globalThis.fetch(request)
   if (!res.ok) {
      console.error(`error while fetching ${fullentryUrl} from +page.server.ts`, res.status);
      error(res.status, {
         message: 'Une erreur est survenue.',
         code: res.status,
         type: 'entry'
      });
   }
   const fullentry = await res.json() as EntryFull;
   const memberships = fullentry.memberships ? entries.filter((e)=>{ return fullentry.memberships?.includes(e.uid)}) : undefined;

   return {
      fullentry: fullentry,
      memberships: memberships,
   }
}
