import { variables } from '$lib/utils/constants.ts';
import type { Facility } from '$lib/interfaces/v2/facility.ts';
import { authReq } from '$lib/utils/request.ts';
import type { Actions } from './$types';

const getLocation = (formEntries: { [k: string]: FormDataEntryValue; }) => {
  const longitudeString: string = formEntries.longitude.toString();
  const longitude: number = parseFloat(longitudeString);
  const latitudeString: string = formEntries.latitude.toString();
  const latitude: number = parseFloat(latitudeString);
  if (longitude || latitude) {
    return { longitude: longitude, latitude: latitude }
  } else {
    return null
  }
};

export const actions = {
  default: async (event) => {
    const formData = await event.request.formData();
    let jsonString = JSON.stringify(Object.fromEntries(formData));
    let json = JSON.parse(jsonString);
    json["location"] = getLocation(json);
    json["zoom"] = parseInt(json["zoom"]);
    delete json.latitude;
    delete json.longitude;
    console.log(`data:${JSON.stringify(json)}`);
    const url = `${variables.BASE_URI}/api/v2/facilities/`;
    const body = JSON.stringify(json);
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