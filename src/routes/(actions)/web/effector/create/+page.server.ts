import { fail } from '@sveltejs/kit';
import { variables } from '$lib/utils/constants.ts';
import type { Effector } from '$lib/interfaces/v2/effector.ts';
import type { Actions } from './$types';

export const actions = {
  default: async (event) => {
    const formData = await event.request.formData();
    const cookieKey = import.meta.env.VITE_DEV == 'true' ? 'authjs.session-token' : '__Secure-authjs.session-token';
    console.log(`form action auth cookie: ${JSON.stringify(event.cookies.get(cookieKey))}`);
    let jsonString = JSON.stringify(Object.fromEntries(formData));
    let json = JSON.parse(jsonString);
    console.log(`data:${JSON.stringify(json)}`);
    let response = await fetch('https://dev.sante-gadagne.fr/api/v2/cookie', {
      credentials: 'include',
      method: 'GET'
})
    console.log(`normal fetch ${response}`);
    let _json = await response.json()
    console.log(`normal fetch ${_json}`);
  response = await event.fetch('https://dev.sante-gadagne.fr/api/v2/cookie', {
    credentials: 'include',
  method: 'POST'
})
  console.log(`event fetch ${response}`);
  _json = await response.json()
  console.log(`event fetch ${_json}`);

response = await fetch('https://dev.sante-gadagne.fr/api/v2/debug', {
    credentials: 'include',
  method: 'POST'
})
  console.log(`event debug ${response}`);
  _json = await response.json()
  console.log(`event debug ${_json}`);

    response = await event.fetch(`${variables.BASE_URI}/api/v2/effectors`, {
      /*headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },*/
      credentials: 'include',
      method: 'POST',
      body: JSON.stringify(json)
    });
    if (response.ok == false) {
      console.error(response.status)
      console.error(response.statusText)
      return {
        success: false,
        status: response.status
      }
    } else {
      const json = await response.json()
      console.log(`Status: ${response.status} Status text: ${response.statusText}`);
      console.log(json);
      return {
        success: true,
        status: response.status,
        message: response.statusText,
        data: json
      }
    }
  }
} satisfies Actions;