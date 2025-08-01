import type { Actions, PageServerLoad } from './$types';
import { variables } from '$lib/utils/constants';

const setAuthHeader = (request: Request, cookies: Array<{ name: string, value: string }>): Request => {
    request.headers.set(
        'cookie',
        cookies.filter(({ value }) => value !== '').filter(({ name }) => ['authjs.session-token', '__Secure-authjs.session-token'].includes(name)).map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join('; ')
    )
    return request
}

export const actions = {
    default: async (event) => {
        const formData = await event.request.formData();
        const url = `${variables.BASE_URI}/api/v2/monkeys/`;
        let request = new Request(url,
            {   credentials: 'include',
                method: 'POST',
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ 'name': formData.get('name') })
            }
        );
        request.headers.set(
            'cookie',
            event.cookies
                .getAll()
                .filter(({ value }) => value !== '')
                .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
                .join('; ')
        );
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
