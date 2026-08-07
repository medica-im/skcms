import { ORIGIN } from '$lib/utils/origin.ts';
import { error } from '@sveltejs/kit';
import { authReq } from '$lib/utils/request.ts';
import { variables } from '$lib/utils/constants.ts';
import type { EntryGenerator, PageServerLoad } from './$types';
import type { Facility } from '$lib/interfaces/facility.interface.ts';

function isHexUUID(h: string) {
    return h.match(/^[a-f0-9]{32}$/i) !== null;
}

/**
 * The facility, and whether this visitor may change it.
 *
 * Both are resolved here rather than in the universal load because the second
 * needs the session cookie, which only the server can read. Worked out in the
 * component instead, the answer arrived after rendering on a client-side
 * navigation and the editing controls stayed hidden until a reload.
 *
 * The facility is fetched once and its uid used straight away, so the two
 * always describe the same facility.
 */
export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
    const slug = params.slug;
    if (!slug) {
        error(404, 'Slug manquant.');
    }
    const endpoint = isHexUUID(slug) ? 'public/facilitiesuid' : 'public/facilities';
    const url = `${ORIGIN}/api/v2/${endpoint}/${slug}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'content-type': 'application/json'
        }
    });
    if (!response.ok) {
        console.error(`sites/[slug] PageServerLoad fetch ${url} response status: ${response.status}`);
        error(response.status, {
            message: 'Une erreur est survenue.',
            code: response.status,
            type: 'site'
        });
    }
    const facility = await response.json() as Facility;

    return {
        facility: facility,
        canEdit: await canEdit(facility?.uid, cookies)
    };
};

/**
 * Asked of the backend rather than inferred from the session: being signed in
 * says nothing about being connected to *this* facility, and a staff member of
 * the organisation who has no entry here may not edit it.
 *
 * Never throws: whoever may not edit is a normal answer, not a failure, and
 * neither is asking while signed out. Both mean false.
 *
 * Kept off the /public/facilities payload deliberately — that response is
 * cached per site with no user in the key, so a per-user flag stored there
 * would be served to whoever asked next.
 */
async function canEdit(uid: string | undefined, cookies: import('@sveltejs/kit').Cookies): Promise<boolean> {
    if (!uid) return false;
    try {
        const url = `${variables.BASE_URI}/api/v2/facilities/${uid}/can-edit`;
        const response = await fetch(authReq(url, 'GET', cookies));
        if (!response.ok) return false;
        return (await response.json()).can_edit === true;
    } catch (err) {
        console.error(`sites/[slug] can-edit fetch failed:`, err);
        return false;
    }
}

export const entries: EntryGenerator = async () => {
    const url = `${ORIGIN}/api/v2/public/facilities`;
    try {
        const response = await fetch(
            url,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'content-type': 'application/json'
                }
            }
        );
        if (!response.ok) {
            console.error(`entries fetch ${url} failed: ${response.status}`);
            return [];
        }
        const facilities: Facility[] = await response.json();
        const slugArr: { slug: string }[] = []
        const slugs: string[] = facilities.map((e) => { return e.slug || e.uid });
        slugs.forEach((e) => {
            const slug = { slug: e };
            slugArr.push(slug);
        })
        return slugArr
    } catch (error) {
        console.error(`entries fetch ${url} error:`, error);
        return [];
    }
};

export const prerender = false;