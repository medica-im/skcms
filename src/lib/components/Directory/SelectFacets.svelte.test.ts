/**
 * The facet selectors of the directory: the URL is the state. A selector shows
 * only when the entries could be narrowed by it, so a directory that stores no
 * facets shows none; choosing writes the choice to the address and leaves the
 * other filters as they were.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import { writable } from 'svelte/store';
import * as m from '$msgs';
import SelectFacets from './SelectFacets.svelte';
import { lastQuery } from '$lib/testing/directoryFilter';
import { makeEntry } from '$lib/store/directoryStore.fixtures';
import { NO_FACETS } from '$lib/store/facetFilters';
import '../../../app.postcss';

const nav = vi.hoisted(() => ({ goto: vi.fn() }));
const state = vi.hoisted(() => ({ url: new URL('https://dev.santelyon3.fr/annuaire') }));
vi.mock('$app/navigation', () => nav);
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return state.url;
		},
		data: {}
	}
}));

const ENTRIES = [
	makeEntry({
		uid: 'a',
		facets: { who_can_contact: 'anyone', access_modes: ['phone'], age_min: 16, free: true }
	}),
	makeEntry({
		uid: 'b',
		facets: { who_can_contact: 'referral', access_modes: ['walk_in'], free: false }
	})
];

const mount = (entries = ENTRIES, search = '') => {
	state.url = new URL(`https://dev.santelyon3.fr/annuaire${search}`);
	const store = writable(NO_FACETS);
	render(SelectFacets, {
		props: { entries },
		context: new Map<string, unknown>([['facetSelection', store]])
	});
	return store;
};

beforeEach(() => nav.goto.mockClear());

describe('SelectFacets', () => {
	it('shows nothing when the entries store no facets', async () => {
		mount([makeEntry({ uid: 'a' }), makeEntry({ uid: 'b' })]);
		await expect.element(screen.getByText(m.DIRECTORY_FACET_ACCESS())).not.toBeInTheDocument();
		await expect.element(screen.getByText(m.DIRECTORY_FACET_AGE())).not.toBeInTheDocument();
	});

	it('offers the values the entries carry, with how many carry each', async () => {
		mount();
		await expect.element(screen.getByText(`${m.DIRECTORY_ACCESS_ANYONE()} (1)`)).toBeVisible();
		await expect.element(screen.getByText(`${m.DIRECTORY_ACCESS_REFERRAL()} (1)`)).toBeVisible();
		await expect.element(screen.getByText(`${m.DIRECTORY_ACCESS_PROFESSIONALS()} (1)`)).not.toBeInTheDocument();
	});

	it('writes a chosen value to the address and leaves the other filters', async () => {
		mount(ENTRIES, '?facility=f-1');
		await screen.getByText(`${m.DIRECTORY_MODE_PHONE()} (1)`).click();
		await expect.poll(() => lastQuery(nav.goto)?.get('modes')).toBe('phone');
		expect(lastQuery(nav.goto)?.get('facility')).toBe('f-1');
	});

	it('removes a chosen value when it is chosen again', async () => {
		mount(ENTRIES, '?modes=phone');
		await screen.getByText(`${m.DIRECTORY_MODE_PHONE()} (1)`).click();
		await expect.poll(() => lastQuery(nav.goto)?.has('modes')).toBe(false);
	});

	it('writes the age', async () => {
		mount();
		await screen.getByRole('spinbutton').fill('17');
		await screen.getByRole('spinbutton').element().dispatchEvent(new Event('change', { bubbles: true }));
		await expect.poll(() => lastQuery(nav.goto)?.get('age')).toBe('17');
	});

	it('clears every criterion at once and keeps the other filters', async () => {
		mount(ENTRIES, '?modes=phone&access=anyone&facility=f-1');
		await screen.getByText(m.DIRECTORY_FACET_CLEAR()).click();
		await expect.poll(() => lastQuery(nav.goto)?.has('modes')).toBe(false);
		expect(lastQuery(nav.goto)?.has('access')).toBe(false);
		expect(lastQuery(nav.goto)?.get('facility')).toBe('f-1');
	});

	it('publishes what the address chooses to the directory', async () => {
		const store = mount(ENTRIES, '?access=referral&modes=walk_in');
		await expect
			.poll(() => {
				let current;
				store.subscribe((value) => (current = value))();
				return current;
			})
			.toMatchObject({ access: 'referral', accessModes: ['walk_in'] });
	});
});
