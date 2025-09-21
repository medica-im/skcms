import { fail } from '@sveltejs/kit';
import { variables } from '$lib/utils/constants.ts';
import { authReq } from '$lib/utils/request';
import type { Actions } from './$types';

export const actions = {
  default: async (event) => {
    const formData = await event.request.formData();
    let jsonString = JSON.stringify(Object.fromEntries(formData));
    let json = JSON.parse(jsonString);
    let organization: string = json.organizations;
    let organizations: string[] = [organization];
    json.organizations=organizations;
    console.log(`data:${JSON.stringify(json)}`);
    const url = `${variables.BASE_URI}/api/v2/entries`;
    const body = JSON.stringify(json);
    const request = authReq(url, 'POST', event.cookies, body) 
    const response = await fetch(request);
    if (response.ok == false) {
      console.error(JSON.stringify(response))
      console.error(response.status)
      console.error(response.statusText)
      return {
        success: false,
        status: response.status
      }
    } else {
      const json = await response.json()
      console.log(`Success! Status: ${response.status} Status text: ${response.statusText}`);
      console.log(json);
      return {
        success: true,
        status: response.status,
        data: json
      }
    }
  }
} satisfies Actions;