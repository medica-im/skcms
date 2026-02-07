
import { SvelteKitAuth } from "@auth/sveltekit";
import type { DefaultSession } from "@auth/sveltekit";
import { AUTH_DEBUG } from '$env/static/private';
import GitHub from "@auth/sveltekit/providers/github";
import Google from "@auth/sveltekit/providers/google";

declare module "@auth/sveltekit" {
  interface Session {
    user: {
      provider: string;
      providerAccountId: string;
      /**
       * By default, TypeScript merges new interface properties and overwrites existing ones.
       * In this case, the default session user properties will be overwritten,
       * with the new ones defined above. To keep the default session user properties,
       * you need to add them back into the newly declared interface.
       */
    } & DefaultSession['user'];
  }
}

export const { handle, signIn, signOut } = SvelteKitAuth({
  trustHost: true,
  debug: AUTH_DEBUG == 'true' ? true : false,
  providers: [Google, GitHub],
  callbacks: {
    jwt({ token, user, account, profile }) {
      if (token) {
        /*if (import.meta.env.DEV) {
          console.log("token", JSON.stringify(token));
        }*/
      }
      if (account) {
        /*if (import.meta.env.DEV) {
          console.log("account", JSON.stringify(account));
        }*/
        token.provider = account.provider
        token.providerAccountId = account.providerAccountId
      }
      if (user) { // User is available during sign-in
        /*if (import.meta.env.DEV) {
          console.log("user", JSON.stringify(user));
        }*/
      }
      if ( profile ) {
        /*if (import.meta.env.DEV) {
          console.log("profile", JSON.stringify(profile));
        }*/
        token.iss=profile.iss;
        token.aud=profile.aud;
        token.given_name=profile.given_name;
        token.family_name=profile.family_name;
      }
      return token
    },
    session({ session, token }) {
      session.user.provider = token.provider as string;
      session.user.providerAccountId = token.providerAccountId as string;
      return session
    },
    async signIn({ user, account, profile, email, credentials }) {
      //console.log('signin', { user, account, profile });
      return true
    },
    async redirect({ url, baseUrl }) {
    // Allows relative callback URLs
    if (url.startsWith("/")) return `${baseUrl}${url}`
    // Allows callback URLs on the same origin
    if (new URL(url).origin === baseUrl) return url
    return baseUrl
    }
  },
  events: {
    async signOut(message) {
    },
    async signIn({ account, user, isNewUser, profile }) {
    }/*,
    async session({ session, token }) {
      console.log("hooks.server.ts session", session);
    }*/
  }
})