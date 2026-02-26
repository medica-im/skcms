import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { Effector } from '$src/lib/interfaces/v2/effector';
import type { PageLoad } from './$types';
import type { User } from '$src/lib/interfaces/user.interface';

function getUrlParams(user: User, directoryName: string) {
    if ( user?.role === 'superuser' ) {
        return ""
    } else if ( user?.role === 'administrator' ) {
        return `?directory=${encodeURIComponent(directoryName)}`
    } else if ( user?.role === 'staff') {
        return `?owner=${encodeURIComponent(user.uid)}`
    }
}

export const load: PageLoad = async ({ params, fetch, parent }) => {
    const { user } = await parent();
    if (user===undefined) throw new Error("user undefined")
    const { organization } = await parent();
    if (organization===undefined) throw new Error("organization undefined")
    const { directory } = await parent();
    if (directory===undefined) throw new Error("directory undefined")
    const directoryName = directory?.name;

    const urlParams = getUrlParams(user, directoryName);
    const url = `${ORIGIN}/api/v2/effectors${urlParams}`;
    console.log("getEffectors url", url);
    const response = await fetch(url);
    if (response.ok == false) {
        console.error(response.status)
        console.error(response.statusText)
        throw Error(`${response.status} ${response.text}`)
    }
    return {
        effectors: await response.json() as Effector[],
        user: user
    }
}
