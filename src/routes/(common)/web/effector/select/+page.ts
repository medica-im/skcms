import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { Effector } from '$src/lib/interfaces/v2/effector';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch, parent }) => {
    const { user } = await parent();
    const { organization } = await parent();
    if (organization===undefined) throw new Error("organization undefined")
    const { directory } = await parent();
    if (directory===undefined) throw new Error("directory undefined")
	let isSuperUser = user?.role === 'superuser';
    const directoryName = isSuperUser ? null : directory?.name;

    const urlParams = directoryName ? `?directory=${encodeURIComponent(directoryName)}` : '';
    const url = `${ORIGIN}/api/v2/effectors${urlParams}`;
    console.log("getEffectors url", url);
    const response = await fetch(url);
    if (response.ok == false) {
        console.error(response.status)
        console.error(response.statusText)
        throw Error(`${response.status} ${response.text}`)
    }
    return {
        effectors: await response.json() as Effector[]
    }
}
