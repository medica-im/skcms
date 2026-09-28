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
    request.headers.set('cookie', authCookieHeader(cookies))
    return request
}

/** The session cookie alone, as a Cookie header for the backend. */
export const authCookieHeader = (cookies: Cookies): string =>
    cookies
        .getAll()
        .filter(({ value }) => value !== '')
        .filter(({ name }) => ['authjs.session-token', '__Secure-authjs.session-token'].includes(name))
        .map(({ name, value }) => `${name}=${value}`)
        .join('; ');

/**
 * An authenticated upload. No Content-Type is set: fetch writes
 * `multipart/form-data; boundary=...` from the FormData, and a hand-written
 * one would lack the boundary the server needs to find the parts.
 */
export const authMultipartReq = (url: string, method: Method, cookies: Cookies, body: FormData): Request => {
    const request = new Request(url, {
        credentials: 'include',
        method: method,
        headers: { 'Accept': 'application/json' },
        body: body
    });
    request.headers.set('cookie', authCookieHeader(cookies));
    return request
}