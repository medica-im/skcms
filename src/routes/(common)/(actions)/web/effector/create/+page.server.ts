import { fail } from '@sveltejs/kit';
import { variables } from '$lib/utils/constants.ts';
import { authReq } from '$lib/utils/request';
import type { Effector } from '$lib/interfaces/v2/effector.ts';
import type { Actions } from './$types';

export const actions = {
  default: async (event) => {
    const formData = await event.request.formData();
    const url = `${variables.BASE_URI}/api/v2/effectors`;
    const body = JSON.stringify(Object.fromEntries(formData));
    const request = authReq(url, 'POST', event.cookies, body);
    const response = await fetch(request);
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