/** The page to return to after signing in: the one asked for, else the fallback. */
export function signinRedirectTo(asked: string | null, fallback: string): string {
	return asked || fallback;
}
