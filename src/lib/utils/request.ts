import type { Cookies } from '@sveltejs/kit';

export type Method =
  | 'GET'
  | 'OPTIONS'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'

export const authReq = (url: string, method: Method, cookies: Cookies, body: string|null=null): Request => {
    let request;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        request = new Request(url,
            {   credentials: 'include',
                method: method,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: body
            }
        )
    } else {
        request = new Request(url,
            {   credentials: 'include',
                method: method,
                headers: {
                    'Accept': 'application/json',
                }
            }
        )
    };
    request.headers.set(
        'cookie',
        cookies
        .getAll()
        .filter(({ value }) => value !== '')
        .filter(({ name }) => ['authjs.session-token', '__Secure-authjs.session-token'].includes(name))
        .map(({ name, value }) => `${name}=${value}`).join('; ')
    )
    return request
}