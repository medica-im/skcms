import { variables } from '$lib/utils/constants.ts';
import { error } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request';
import { resolveOwnerCreator } from '$lib/Web/Users/ownerCreator.ts';
import type { EntryFull } from '$lib/store/directoryStoreInterface';
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, params, cookies, parent, depends, url }) => {
   depends('entry:now');
   const { entries, user } = await parent();
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
   // Resolved here rather than in the panel that shows them: a component
   // awaiting a remote query renders its pending branch during SSR and never
   // resolves there. See resolveOwnerCreator for the whole story.
   //
   // Only for the roles that actually render that panel, and this gate is not
   // an optimisation. /api/v2/users/{uid} answers 401 to an anonymous caller,
   // and resolving treats anything other than 200 or 404 as fatal — so asking
   // on behalf of a visitor who will never see the answer turned every public
   // entry page into a 500. Mirrors the `{#if}` in EffectorContact.svelte; the
   // two must agree, since one deciding to show what the other did not fetch
   // is what an empty panel looks like.
   const users = ['superuser', 'administrator'].includes(user?.role ?? '')
      ? await resolveOwnerCreator(fullentry.owner, fullentry.creator, cookies)
      : [];

   return {
      fullentry: fullentry,
      memberships: memberships,
      users: users,
   }
}
