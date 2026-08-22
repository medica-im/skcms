import { describe, it, expect } from 'vitest';
import { base } from '$app/paths';

/**
 * The sign-in form must post to this app, not to whatever serves the site root.
 *
 * @auth/sveltekit's SignIn component builds its action as
 *
 *     action={`/${signInPage}`}
 *
 * with no knowledge of kit's base path. On an instance served under one — the
 * directory at unipa.fr/annuaire — that emits action="/signin", which is
 * WordPress's namespace: the POST leaves the app entirely and sign-in fails
 * with a JSON parse error, because an HTML 404 comes back where a session was
 * expected.
 *
 * This file pins the SHAPE of the value: no leading slash (the component adds
 * one), which makes it easy to "fix" into a double slash. That every use site
 * actually passes the prop is a different question, checked across the whole
 * tree by authFormActions.test.ts.
 */


/** The same expression the page computes, kept in one place. */
const signInPath = base ? `${base.slice(1)}/signin` : 'signin';

describe('the sign-in form action', () => {
	it('has no leading slash — the component adds one', () => {
		expect(signInPath.startsWith('/')).toBe(false);
	});

	it('yields exactly one slash before signin once the component prefixes it', () => {
		expect(`/${signInPath}`).not.toContain('//');
	});

	it('posts inside the app, base path included', () => {
		expect(`/${signInPath}`).toBe(`${base}/signin`);
	});

});
