
import { SvelteKitAuth } from "@auth/sveltekit";
import type { DefaultSession } from "@auth/sveltekit";
import { AUTH_DEBUG } from '$env/static/private';
import GitHub from "@auth/sveltekit/providers/github";
import Google from "@auth/sveltekit/providers/google";

declare module "@auth/sveltekit" {
  interface Session {
    user: {
      userId: string;
      provider: string;
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
    jwt({ token, user, account }) {
      if (token) {
        //console.log(`token: ${JSON.stringify(token)}`);
      }
      if (account) {
        //console.log(`account: ${JSON.stringify(account)}`);
        token.provider = account.provider
      }
      if (user) { // User is available during sign-in
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      session.user.userId = token.id as string
      session.user.provider = token.provider as string;
      return session
    },
    async signIn({ user, account, profile, email, credentials }) {
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