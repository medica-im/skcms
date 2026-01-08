import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, url }) => {
	const fetchUrl = `${ORIGIN}/api/v1/${params.path}${url.search}`;
    return fetch(fetchUrl);
};

export const trailingSlash = 'ignore';