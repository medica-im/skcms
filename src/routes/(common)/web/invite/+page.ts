import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { Invitee } from '$src/lib/interfaces/v2/invitee';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch, parent }) => {
    const { user } = await parent();
    const { organization } = await parent();
    if (organization===undefined) throw new Error("organization undefined")
    const { directory } = await parent();
    if (directory===undefined) throw new Error("directory undefined")
	let isSuperUser = user?.role === 'superuser';
    const directoryName = isSuperUser ? null : directory?.name;

    const url = `${ORIGIN}/api/v2/invitees`;
    const response = await fetch(url);
    if (response.ok == false) {
        console.error(response.status)
        console.error(response.statusText)
        throw Error(`${response.status} ${response.text}`)
    }
    return {
        invitees: await response.json() as Invitee[]
    }
}
