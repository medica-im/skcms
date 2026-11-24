/**
 * Did the machine running the browser change network while the page loaded?
 *
 * Chrome fails the requests in flight with ERR_NETWORK_CHANGED when an interface
 * or address changes, and a docker host changes them whenever a container starts
 * or stops. Any one such error is enough: the page's other errors may be what
 * the app made of the failed request ("Failed to fetch"). The caller loads the
 * page again and judges that load on its own, so a real error is not forgiven.
 */
export const hasNetworkChange = (errors: string[]): boolean =>
	errors.some((error) => error.includes('ERR_NETWORK_CHANGED'));
