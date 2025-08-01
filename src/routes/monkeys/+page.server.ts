import type { Actions, PageServerLoad } from './$types';
import { variables } from '$lib/utils/constants';

const setAuthHeader = (request: Request, cookies: Array<{ name: string, value: string }>) => {
    request.headers.set(
        'cookie',
        cookies.filter(({ name }) => ['authjs.session-token', '__Secure-authjs.session-token'].includes(name)).map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join('; ')
    )
}

export const actions = {
    default: async (event) => {
        const formData = await event.request.formData();
        let _request = new Request(
            `${variables.BASE_URI}/api/v2/jwt`,
            { credentials: 'include' }
        );
        _request.headers.set(
            'cookie',
            event.cookies
                .getAll()
                .filter(({ value }) => value !== '') // account for cookie that got deleted in the current request
                .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
                .join('; ')
        );
        const jwtres = await fetch(_request);
        let data = await jwtres.json();
        console.log(data);
        _request = new Request(
            `${variables.BASE_URI}/api/v2/auth`, {
            credentials: 'include'
        });
        setAuthHeader(_request, event.cookies.getAll());
        const authres = await fetch(_request);
        data = await authres.json();
        console.log(data);
        console.log(`all cookies:${JSON.stringify(event.cookies.getAll())}`);
        console.log(formData.get('name'))
        const url = `${variables.BASE_URI}/api/v2/monkeys/`;
        const res = await fetch(url,
            {
                method: 'POST',
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ 'name': formData.get('name') })
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
