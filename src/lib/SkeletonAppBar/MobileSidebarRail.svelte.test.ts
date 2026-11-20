/**
 * The mobile drawer's rail of the app's own pages, on a site with no parent
 * menu, served under a base path (unipa: /annuaire).
 *
 * Its links carry the base path, so the page being shown must be compared
 * with the base path too, or no link is ever marked as the current one.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page as browser } from 'vitest/browser';

const { current } = vi.hoisted(() => ({ current: { pathname: '/annuaire' } }));

vi.mock('$app/state', () => ({
	page: {
		get url() {
			return new URL(`https://dev.example.org${current.pathname}`);
		},
		data: {
			organization: {
				category: { name: 'msp' },
				google_calendar_id: 'calendar',
				google_calendar_api_key: 'key',
				contact: { websites: [] }
			},
			directory: { setting: { path: '/repertoire' } }
		}
	}
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => `/annuaire/${path}`,
	base: () => '/annuaire'
}));

vi.mock('$var/variables.ts', () => ({ menuNavCats: [] }));

vi.mock('#lib/SiteMenu/siteMenu.ts', () => ({
	siteMenu: null,
	hasParentSite: false,
	visibleItems: () => [],
	displayLabel: (label: string) => label,
	menuWithOwnPages: () => []
}));

vi.mock('@skeletonlabs/skeleton', async (importOriginal) => ({
	...(await importOriginal<typeof import('@skeletonlabs/skeleton')>()),
	getDrawerStore: () => ({ close: () => {} })
}));

import MobileSidebar from './MobileSidebar.svelte';

const link = (name: RegExp) => browser.getByRole('link', { name }).first();
const isSelected = (name: RegExp) =>
	link(name).element().querySelector('.app-rail-wrapper')!.classList.contains('bg-primary-active-token');

beforeEach(async () => {
	await browser.viewport(390, 844);
});

describe('MobileSidebar rail under a base path', () => {
	it('links the directory through the base path', async () => {
		render(MobileSidebar, { currentRailCategory: undefined, navLinks: [] });

		await expect.element(link(/Annuaire/i)).toHaveAttribute('href', '/annuaire/repertoire');
	});

	it.each([
		['/annuaire', /Accueil/i],
		['/annuaire/repertoire', /Annuaire/i],
		['/annuaire/sites', /Sites/],
		['/annuaire/calendrier', /Calendrier/i],
		['/annuaire/contact', /Contact/i]
	])('marks the link to %s as the current page', async (pathname, name) => {
		current.pathname = pathname;
		render(MobileSidebar, { currentRailCategory: undefined, navLinks: [] });

		await expect.element(link(name)).toBeVisible();
		expect(isSelected(name)).toBe(true);
	});

	it('marks no other link as the current page', async () => {
		current.pathname = '/annuaire/sites';
		render(MobileSidebar, { currentRailCategory: undefined, navLinks: [] });

		await expect.element(link(/Sites/)).toBeVisible();
		expect(isSelected(/Accueil/i)).toBe(false);
		expect(isSelected(/Calendrier/i)).toBe(false);
	});
});
