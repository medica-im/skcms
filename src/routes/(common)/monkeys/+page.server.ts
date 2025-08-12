import type { Actions, PageServerLoad } from './$types';
import { variables } from '$lib/utils/constants';
import { authReq } from '$lib/utils/request.ts';

export const actions = {
    default: async (event) => {
        const formData = await event.request.formData();
        const url = `${variables.BASE_URI}/api/v2/monkeys/`;
        const body = JSON.stringify({ 'name': formData.get('name') });
        const request = authReq(url,'POST', event.cookies, body)
        const res = await fetch(request)
        if (res.ok) {
            return {
                success: true,
                data: await res.json()
            }
        } else {
            console.error(JSON.stringify(res))
            return { success: false }
        }
    }
} satisfies Actions;

export const load: PageServerLoad = async ({ fetch }) => {
    const res = await fetch(`${variables.BASE_URI}/api/v2/monkeys`);
    const monkeys = await res.json();
    return { monkeys };
};
