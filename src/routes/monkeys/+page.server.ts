import type { Actions, PageServerLoad } from './$types';
import { variables } from '$lib/utils/constants';

export const actions = {
    default: async ({ request, cookies, fetch }) => {
        const formData = await request.formData();
        const jwtres = await fetch(
            `${variables.BASE_URI}/api/v2/jwt`,
        {credentials: 'include'}
        );
        console.log(jwtres);
        const authres = await fetch(
            `${variables.BASE_URI}/api/v2/auth`,
        {credentials: 'include'}
        );
        console.log(authres);
        console.log(`all cookies:${JSON.stringify(cookies.getAll())}`);
        console.log(formData.get('name'))
        const url = `${variables.BASE_URI}/api/v2/monkeys/`;
        console.log(url);
        const res = await fetch(url,
            {
                method: 'POST',
                headers: {"content-type": "application/json"},
                body: JSON.stringify({'name': formData.get('name')})
            }
        );
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


export const load: PageServerLoad = async ({ cookies }) => {
    const res = await fetch(`${variables.BASE_URI}/api/v2/monkeys`);
    const monkeys = await res.json();
    return { monkeys };
};
