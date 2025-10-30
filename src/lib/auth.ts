
import { SvelteKitAuth } from "@auth/sveltekit";
import type { DefaultSession } from "@auth/sveltekit";
import { AUTH_PROVIDER_ID, AUTH_PROVIDER_NAME, AUTH_PROVIDER_ISSUER, AUTH_PROVIDER_CLIENT_ID, AUTH_PROVIDER_CLIENT_SECRET, AUTH_DEBUG } from '$env/static/private';
import GitHub from "@auth/sveltekit/providers/github"
import Google from "@auth/sveltekit/providers/google"

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

const provider = {
  id: AUTH_PROVIDER_ID, // signIn("my-provider") and will be part of the callback URL
  name: AUTH_PROVIDER_NAME, // optional, used on the default login page as the button text.
  type: "oidc", // or "oauth" for OAuth 2 providers
  issuer: AUTH_PROVIDER_ISSUER, // to infer the .well-known/openid-configuration URL
  clientId: AUTH_PROVIDER_CLIENT_ID, // from the provider's dashboard
  clientSecret: AUTH_PROVIDER_CLIENT_SECRET // from the provider's dashboard
};

export const { handle, signIn, signOut } = SvelteKitAuth({
  trustHost:true,
  debug: AUTH_DEBUG=='true' ? true : false,
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
      //console.log(`token: ${JSON.stringify(token)}`);
      session.user.userId = token.id as string
      session.user.provider = token.provider as string;
      return session
    },
  }
})