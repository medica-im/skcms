import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$prgld/server';
import { sequence } from '@sveltejs/kit/hooks';
import { SvelteKitAuth, type SvelteKitAuthConfig } from '@auth/sveltekit';

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

const { handle: getAuthConfig } = SvelteKitAuth(async (event) => {
  const config: SvelteKitAuthConfig = {
	providers: [
	],
    events: {

      signOut(message) {
		console.log("signOut");
      },
      signIn({ account, user, isNewUser, profile }) {
				console.log("signIn");
	   },
      session({ session, token }) {
				console.log("session");
	   }
    }
  };
  return config;
});

export const handleBanana: Handle = async ({ event, resolve }) => {
  // if route matches "/banana" return banana
  if (event.url.pathname.startsWith('/banana')) {
    return new Response('🍌')
  }

  // otherwise use the default behavior
  return resolve(event)
}


export const handle = sequence(handleAuth, getAuthConfig, cookie, paraglideHandle, handleBanana);