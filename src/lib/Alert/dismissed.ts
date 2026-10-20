/** The alerts a visitor has closed: a cookie, so the server renders only the others. */
export const DISMISSED_COOKIE = 'dismissed-alerts';

const ONE_YEAR = 365 * 24 * 60 * 60;

export const parseDismissed = (value: string | undefined): string[] =>
	(value ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

/** The cookie that adds `id` to the alerts already closed. */
export function dismissedCookie(closed: string[], id: string, secure: boolean): string {
	const ids = closed.includes(id) ? closed : [...closed, id];
	return `${DISMISSED_COOKIE}=${ids.join(',')}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure ? '; Secure' : ''}`;
}
