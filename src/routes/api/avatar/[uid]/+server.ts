import { json, error } from '@sveltejs/kit';
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

export const PUT: RequestHandler = async ({ request, params, cookies }) => {
    const { uid } = params;
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
        error(400, 'No file provided');
    }

    const proxyFormData = new FormData();
    proxyFormData.append('file', file, file.name);

    const response = await fetch(
        `${variables.BASE_URI}/api/v2/entries/${uid}/avatar`,
        {
            method: 'PUT',
            headers: {
                cookie: getAuthCookieHeader(cookies),
                Accept: 'application/json',
            },
            body: proxyFormData,
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            detail: response.statusText,
        }));
        error(response.status, errorData.detail || 'Upload failed');
    }

    return json(await response.json());
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
    const { uid } = params;

    const response = await fetch(
        `${variables.BASE_URI}/api/v2/entries/${uid}/avatar`,
        {
            method: 'DELETE',
            headers: {
                cookie: getAuthCookieHeader(cookies),
                Accept: 'application/json',
            },
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            detail: response.statusText,
        }));
        error(response.status, errorData.detail || 'Delete failed');
    }

    return json(await response.json());
};
