import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { initialTheme } from './theme/initialTheme';

/**
 * Which theme the appbar's dropdown shows as selected.
 *
 * There are two theme states, and until this they did not know about each
 * other:
 *
 *   - what the page RENDERS: `hooks.server.ts` reads `SITE_THEME` from the
 *     deploy host's env, sets the `theme` cookie and substitutes the rendered
 *     `data-theme` attribute;
 *   - what the DROPDOWN highlights: `storeTheme`, a localStorage-backed store
 *     declared `localStorageStore('storeTheme', 'wintry')`.
 *
 * The literal `'wintry'` is the bug. Nothing ever seeded that store from the
 * server's choice — the only write is in the appbar's submit handler, so it
 * moved only when somebody actively picked a theme. On unipa, with
 * `SITE_THEME=unipa`, the page was visibly the unipa palette while the
 * dropdown said Wintry. Reproduced on production.unipa.fr after clearing
 * cookies and site data, so it is not a stale stored value: it is the default
 * being wrong for every first-time visitor to any site that sets SITE_THEME.
 *
 * The `theme` cookie cannot be read to fix it — it is set `HttpOnly`
 * (verified: `theme=unipa; Path=/; HttpOnly; Secure; SameSite=Lax`), so the
 * browser cannot see it from JS. The server's choice has to arrive in page
 * data instead.
 *
 * What must hold, and why this is not simply "use the site theme":
 * `hooks.server.ts` is explicit that SITE_THEME is *only the default* and the
 * cookie still wins, so the switcher keeps working and a visitor's choice
 * survives. A seed that overwrote a stored choice would break exactly that.
 */

describe('the theme the dropdown starts on', () => {
	it('adopts the site theme when the visitor has never chosen one', () => {
		// The bug. A first visit to unipa renders the unipa palette, so the
		// dropdown has to agree with what is on screen.
		expect(initialTheme(null, 'unipa')).toBe('unipa');
	});

	it('keeps a theme the visitor actually chose', () => {
		// SITE_THEME is a default, not a policy: the switcher must keep working
		// and the choice must survive a reload.
		expect(initialTheme('crimson', 'unipa')).toBe('crimson');
	});

	it('keeps a chosen theme even when it equals another site default', () => {
		// Choosing wintry on a unipa site is a real choice, not an absent one,
		// and must not be re-seeded to unipa on the next page load.
		expect(initialTheme('wintry', 'unipa')).toBe('wintry');
	});

	it('falls back to wintry when the site sets no theme', () => {
		// Every site that was here before this setting served wintry, and must
		// go on serving it. Mirrors `env.SITE_THEME || 'wintry'`.
		expect(initialTheme(null, undefined)).toBe('wintry');
		expect(initialTheme(null, '')).toBe('wintry');
	});

	it('treats an empty stored value as no choice at all', () => {
		// localStorage hands back '' rather than null in some states; an empty
		// string is not a theme and must not win over the site's.
		expect(initialTheme('', 'unipa')).toBe('unipa');
	});

	it('still prefers a stored choice when the site sets no theme', () => {
		expect(initialTheme('seafoam', undefined)).toBe('seafoam');
	});
});

/**
 * The wiring, not just the rule.
 *
 * The function above can be right while the bug survives, because the bug is
 * that nothing calls it: `storeTheme` is declared with a literal `'wintry'`
 * default and the appbar highlights `$storeTheme === type`. These read the
 * source so the defect cannot come back by the same route — a unit test of a
 * pure helper would not have caught it in the first place.
 */
describe('the appbar and the theme store, as wired', () => {
	const read = (p: string) =>
		readFileSync(new URL(p, import.meta.url), 'utf8');

	it('does not hardcode a theme as the store default', () => {
		// `localStorageStore('storeTheme', 'wintry')` is the bug: a literal that
		// no site setting can move, on the store the dropdown highlights from.
		const src = read('./store/skeletonStores.ts');
		const decl = src.match(/storeTheme[^\n]*localStorageStore\([^)]*\)/)?.[0] ?? '';

		expect(decl, 'storeTheme declaration').not.toMatch(/'wintry'|"wintry"/);
	});

	it('seeds the switcher from the site theme through initialTheme', () => {
		// Whatever the mechanism, the appbar must consult the shared rule rather
		// than inventing a second one.
		const src = read('./SkeletonAppBar/SkeletonAppBar.svelte');

		expect(src).toMatch(/initialTheme/);
	});
});
