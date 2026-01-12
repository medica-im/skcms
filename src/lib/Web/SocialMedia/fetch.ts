import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';

type SomedTypesJson = [[string, string]]

export const getSomedTypes =  async () => {
	const response = await fetch(`${ORIGIN}/api/v2/socialmediatypes`);
	if (!response.ok) {
		console.error("error while fetching socialmediatypes", response.status)
		return
	}
	const somedTypesJson = await response.json() as SomedTypesJson;
	console.log(somedTypesJson);
	return somedTypesJson.map((e)=>{return {value: e[0], label: e[1]}})
}