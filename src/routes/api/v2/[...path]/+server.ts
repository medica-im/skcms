import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, url }) => {
	const fetchUrl = `${ORIGIN}/api/v2/${params.path}`;
    console.log("fetchUrl", fetchUrl);
    return fetch(fetchUrl);
};