import type { Handle, HandleServerError } from '@sveltejs/kit';
import { paraglideMiddleware } from '$prgld/server';
import { sequence } from '@sveltejs/kit/hooks';
import { handle as handleAuth } from "$lib/auth.ts"
import { env } from '$env/dynamic/private';

export const handleError: HandleServerError = async ({ error }) => {
    if (env.DEBUG_MODE === 'true') {
        return {
            message: (error as Error).message,
            stack: (error as Error).stack
        };
    }
    return { message: 'Une erreur inattendue est survenue.' };
};

const handleDebug: Handle = async ({ event, resolve }) => {
    if (env.DEBUG_MODE === 'true') {
        console.log(`[DEBUG] Requête reçue : ${event.request.method} ${event.url.pathname}`);
        // Log des headers ou du payload si nécessaire
    }
    return await resolve(event);
};

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

export const handle = sequence(
	handleDebug,
	handleAuth,
	paraglideHandle,
	cookie
);