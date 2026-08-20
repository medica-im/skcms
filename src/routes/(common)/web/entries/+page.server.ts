import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The gate, and only the gate.
//
// It lives on the server so an unauthenticated visitor is turned away with a
// 303 on the first request, before any of the application is sent. In the
// +page.ts beside this file the same check could only run once the browser had
// booted, which means shipping the page to someone who may not sign in and
// showing them a flash of it before the redirect. locals.auth() is server-only
// in any case.
//
// The admin payload itself is fetched in +page.ts: in the browser the session
// cookie rides along on a relative request on its own, whereas fetching it
// here would have to hand-set a cookie header that SvelteKit's event fetch
// then strips whenever it reads the request as same-origin.
export const load: PageServerLoad = async ({ url, locals }) => {
	const session = await locals.auth();
	if (!session) {
		redirect(303, `/signin?redirect=${url.pathname}`);
	}
	return { session };
};
