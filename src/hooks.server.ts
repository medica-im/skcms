import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$prgld/server';
import { sequence } from '@sveltejs/kit/hooks';

import { handle as handleAuth } from "$lib/auth.ts"

const cookie: Handle = async ({ event, resolve }) => {
	let theme = '';
	const cookieTheme = event.cookies.get('theme');
	if (cookieTheme) {
		theme = cookieTheme;
	} else {
		event.cookies.set('theme', 'wintry', { path: '/' });
		theme = 'wintry';
	}
	return await resolve(event, {
		transformPageChunk: ({ html }) => 
			html.replace('data-theme=""', `data-theme="${theme}"`)
	});
};

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) => {
				return html.replace('%lang%', locale);
			}
		});
	});
/*
const handleFetch: Handle = async ({ event, resolve }) => {
	const url: string = event.url.toString();
	console.log(import.meta.env.BASE_URL);
    if (url.startsWith(import.meta.env.BASE_URL)) {
        // clone the original request, but change the URL
        let cookies = event.request.headers.get("__Secure-authjs.session-token")
        console.log("Cookies Are : ")
        console.log(event.request.headers)
        event.request.headers.set(
    'cookie',
    event.cookies
        .getAll()
        .filter(({ value }) => value !== '') // account for cookie that got deleted in the current request
        .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
        .join('; ')
);
    }
    return fetch(event.request);
};*/

export const handle = sequence(handleAuth, cookie, paraglideHandle);