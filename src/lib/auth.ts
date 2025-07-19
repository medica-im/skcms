
import { post, browserSet, browserGet, setCurrentUser } from '$lib/utils/requestUtils';
import { variables } from '$lib/utils/constants';
import { SvelteKitAuth } from "@auth/sveltekit";
import type { DefaultSession } from "@auth/sveltekit";
import { AUTH_PROVIDER_ID, AUTH_PROVIDER_NAME, AUTH_PROVIDER_ISSUER, AUTH_PROVIDER_CLIENT_ID, AUTH_PROVIDER_CLIENT_SECRET } from '$env/static/private';
import GitHub from "@auth/sveltekit/providers/github"
import Google from "@auth/sveltekit/providers/google"

declare module "@auth/sveltekit" {
  interface Session {
    user: {
      userId: string,
      provider: string,
      /**
       * By default, TypeScript merges new interface properties and overwrites existing ones.
       * In this case, the default session user properties will be overwritten,
       * with the new ones defined above. To keep the default session user properties,
       * you need to add them back into the newly declared interface.
       */
    } & DefaultSession["user"]
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

const handleLogin = async (credential: string) => {
  if (browserGet('refreshToken')) {
    localStorage.removeItem('refreshToken');
  }
  const url = `${variables.BASE_URI}/api/v2/google?credential=${credential}`;
  console.log(`url: ${url}`);
  try {
    const response = await fetch(
      url,
      {
        credentials: 'include'
      });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const json = await response.json();
    console.log(json);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
  const setCookieUrl = `${variables.BASE_URI}/api/v2/set-cookie`;
  let res = await fetch(setCookieUrl);
  let _json = await res.json();
  console.log(JSON.stringify(_json));
  const getCookieUrl = `${variables.BASE_URI}/api/v2/get-cookie`;
  res = await fetch(getCookieUrl);
  _json = await res.json();
  console.log(JSON.stringify(_json));
};

export const { handle, signIn, signOut } = SvelteKitAuth({
  debug: true,
  providers: [Google, GitHub],
  callbacks: {
    jwt({ token, user, account }) {
      if (token) {
        console.log(`token: ${JSON.stringify(token)}`);
      }
      if (account) {
        console.log(`account: ${JSON.stringify(account)}`);
        const id_token = account.id_token;
        console.log(`id_token: ${id_token}`)
        if (id_token) {
          handleLogin(id_token)
        }
        token.provider = account.provider
      }
      if (user) { // User is available during sign-in
        token.id = user.id
      }
      console.log(`token:${JSON.stringify(token)}`)
      return token
    },
    session({ session, token }) {
      console.log(`token: ${JSON.stringify(token)}`);
      session.user.userId = token.id as string
      session.user.provider = token.provider as string;
      return session
    },
  }
})