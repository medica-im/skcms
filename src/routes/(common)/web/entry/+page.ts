import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { Effector } from '$src/lib/interfaces/v2/effector';
import type { PageLoad } from './$types';
import type { User } from '$src/lib/interfaces/user.interface';


export const load: PageLoad = async ({ params, fetch, parent, data }) => {
    return {
        user: data.user,
        effectors: data.effectors,
        session: data.session
    }
}
