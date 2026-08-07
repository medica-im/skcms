import type { Handle, HandleServerError } from '@sveltejs/kit';
import { paraglideMiddleware } from '$prgld/server';
import { sequence } from '@sveltejs/kit/hooks';
import { handle as handleAuth } from "$lib/auth.ts"
import { env } from '$env/dynamic/private';

export const handleError: HandleServerError = async ({ error }) => {
    console.error('[SSR Error]', (error as Error).message, (error as Error).stack);
    if (env.DEBUG_MODE === 'true') {
        return {
            message: (error as Error).message,
            stack: (error as Error).stack
        };
    }
    return { message: 'Une erreur inattendue est survenue.' };
};

/**
 * Vite's dev server always sees plain HTTP from nginx, which terminates TLS
 * in front of it — nothing tells SvelteKit the original request was HTTPS.
 * event.url then disagrees with PUBLIC_ORIGIN (which is https://), and
 * anything that compares the two breaks: Auth.js's PKCE cookie is encrypted
 * with a salt derived from the cookie name, which itself depends on whether
 * Auth.js believes the request is secure — a mismatch between the /signin
 * request and the callback request makes decryption fail even though the
 * cookie arrives intact (InvalidCheck: value could not be parsed). The same
 * mismatch also broke SSR fetches back to PUBLIC_ORIGIN, simulating a CORS
 * failure server-side.
 *
 * Only rewrites when x-forwarded-proto disagrees with what event.url already
 * has, so this is a no-op both in production behind a proxy configured the
 * same way and when running without one (e.g. `vite preview`).
 */
const trustForwardedProto: Handle = async ({ event, resolve }) => {
	const proto = event.request.headers.get('x-forwarded-proto');
	if (proto && event.url.protocol !== `${proto}:`) {
		const url = new URL(event.url);
		url.protocol = proto;
		event.request = new Request(url, event.request);
		// event.url is its own property, derived when SvelteKit built the event
		// — replacing event.request above does *not* update it. It is what the
		// enhanced fetch compares a target URL against to decide same-origin, so
		// leaving it on http:// while PUBLIC_ORIGIN is https:// makes every SSR
		// fetch back to our own API look cross-origin and fail with a CORS
		// error that never left the process (curl against the same URL returns
		// the right Access-Control-Allow-Origin, which is what makes this so
		// confusing to diagnose).
		try {
			Object.defineProperty(event, 'url', { value: url, configurable: true });
		} catch {
			// Older SvelteKit versions expose url as a non-configurable getter.
			// Nothing to do but let the request through: the mismatch only
			// affects absolute same-origin fetches, which the callers can avoid
			// by using a root-relative path instead.
		}
	}
	return resolve(event);
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
	trustForwardedProto,
	handleDebug,
	handleAuth,
	paraglideHandle,
	cookie
);