import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { variables } from '$lib/utils/constants';

function getAuthCookieHeader(cookies: import('@sveltejs/kit').Cookies): string {
    return cookies
        .getAll()
        .filter(({ value }) => value !== '')
        .filter(({ name }) =>
            ['authjs.session-token', '__Secure-authjs.session-token'].includes(name)
        )
        .map(({ name, value }) => `${name}=${value}`)
        .join('; ');
}

/**
 * Whether the signed-in user may change this facility.
 *
 * The answer comes from the backend rather than being worked out here: the
 * frontend knows the user's role but not which facilities they are connected
 * to, and guessing would offer editing controls that the server then refuses.
 *
 * Never an error: somebody who may not edit is a normal answer, not a failure.
 */
export const GET: RequestHandler = async ({ params, cookies }) => {
    const { uid } = params;

    const response = await fetch(`${variables.BASE_URI}/api/v2/facilities/${uid}/can-edit`, {
        method: 'GET',
        headers: {
            cookie: getAuthCookieHeader(cookies),
            Accept: 'application/json'
        }
    });

    if (!response.ok) {
        return json({ can_edit: false });
    }

    return json(await response.json());
};
