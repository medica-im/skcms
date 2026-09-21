import { writable, type Writable } from 'svelte/store';
import { localStorageStore } from '@skeletonlabs/skeleton';

/**
 * The theme the visitor has chosen, or '' if they never have.
 *
 * '' rather than a theme name on purpose. This used to default to 'wintry',
 * which made the value ambiguous — it could not say whether somebody had
 * picked wintry or simply never opened the switcher — so the dropdown
 * highlighted Wintry on a site rendering its own palette from SITE_THEME.
 * Reproduced on production.unipa.fr with cookies and site data cleared, so it
 * was the default itself, not a stale stored value.
 *
 * The site's default belongs to the server, which knows it; see
 * lib/theme/initialTheme.ts for the rule that combines the two, and
 * SkeletonAppBar.svelte for where the empty value is seeded.
 */
export const storeTheme: Writable<string> = localStorageStore('storeTheme', '');

// Persists the tab selection for the user's preferred onboarding method
export const storeOnboardMethod: Writable<string> = localStorageStore('storeOnboardMethod', 'cli');
