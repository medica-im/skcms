/** Whether a request path is the site's /contact page, trailing slash or not. */
export const isContactPath = (pathname: string, base: string) =>
	pathname === `${base}/contact` || pathname === `${base}/contact/`;
