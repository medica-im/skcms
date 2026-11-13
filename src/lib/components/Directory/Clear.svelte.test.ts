/**
 * « Tout effacer » is the one way to clear every filter of the directory, the
 * facet and concern selectors included: they have no clear-all button of their
 * own. It is enabled as soon as anything is chosen, a facet or a concern alone
 * included, and clearing empties the address and the selections.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import { get, writable, type Writable } from 'svelte/store';
import Clear from './Clear.svelte';
import { NO_FACETS, type FacetSelection } from '$lib/store/facetFilters';
import '../../../app.postcss';

const nav = vi.hoisted(() => ({ goto: vi.fn() }));
const state = vi.hoisted(() => ({ url: new URL('https://dev.santelyon3.fr/annuaire') }));
vi.mock('$app/navigation', () => nav);
vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return state.url;
		},
		data: { directory: { setting: { path: '/annuaire' } } }
	}
}));

const mount = (search: string, facets: FacetSelection = NO_FACETS, concern: string | null = null) => {
	state.url = new URL(`https://dev.santelyon3.fr/annuaire${search}`);
	const facetSelection: Writable<FacetSelection> = writable(facets);
	const selectConcern = writable<string | null>(concern);
	const context = new Map<string, unknown>([
		['term', writable('')],
		['selectedCommunesUids', writable([])],
		['selectedCommunesChoices', writable(null)],
		['selectedDepartment', writable(null)],
		['selCatVal', writable(null)],
		['selectSituation', writable(undefined)],
		['selectedTags', writable(null)],
		['inputAddress', writable('')],
		['selectFacility', writable(null)],
		['facilityChoice', writable(undefined)],
		['directoryRedirect', writable(false)],
		['addressFeature', writable(null)],
		['geoInputAddress', writable(null)],
		['selectCategories', writable([])],
		['facetSelection', facetSelection],
		['selectConcern', selectConcern]
	]);
	render(Clear, { context });
	return { facetSelection, selectConcern };
};

const button = () => screen.getByRole('button', { name: 'Tout effacer' });
const lastUrl = () => String(nav.goto.mock.lastCall?.[0] ?? '');

beforeEach(() => nav.goto.mockClear());

describe('Tout effacer', () => {
	it('is disabled while nothing is chosen', async () => {
		mount('');
		await expect.element(button()).toBeDisabled();
	});

	it('is enabled by a facet alone, and clears it from the address and the selection', async () => {
		const { facetSelection } = mount('?age=17&access=anyone', { ...NO_FACETS, age: 17, access: 'anyone' });
		await expect.element(button()).toBeEnabled();
		await button().click();
		await expect.poll(lastUrl).toBe('?');
		expect(get(facetSelection)).toEqual(NO_FACETS);
	});

	it('is enabled by a concern alone, and clears it', async () => {
		const { selectConcern } = mount('?concern=c-alc', NO_FACETS, 'c-alc');
		await expect.element(button()).toBeEnabled();
		await button().click();
		await expect.poll(lastUrl).toBe('?');
		expect(get(selectConcern)).toBeNull();
	});
});
