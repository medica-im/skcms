/**
 * The facility filter of the address book: the URL is the state. Choosing a
 * facility writes its uid to `?facility=` and clearing removes the parameter,
 * leaving the other filters as they were.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { writable } from 'svelte/store';
import { SvelteURL } from 'svelte/reactivity';
import * as m from '$msgs';
import SelectFacilityR from './SelectFacilityR.svelte';
import type { FacilityOf } from '$lib/interfaces/facility.interface.ts';
import { choose, clear, lastQuery } from '$lib/testing/directoryFilter';
import '../../../app.postcss';

const nav = vi.hoisted(() => ({ goto: vi.fn() }));
const state = vi.hoisted(() => ({ url: new URL('https://dev.santelyon3.fr/annuaire') }));
vi.mock('$app/navigation', () => nav);
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return state.url;
		}
	}
}));

const facilityOf = [
	{ uid: 'f-1', name: 'Maison de santé Gambetta', label: '', street: '12 cours Gambetta', city: 'Lyon' },
	{ uid: 'f-2', name: 'Cabinet Lafayette', label: '', street: '3 cours Lafayette', city: 'Lyon' }
] as unknown as FacilityOf[];

const mount = (search = '') => {
	state.url = new URL(`https://dev.santelyon3.fr/annuaire${search}`);
	render(SelectFacilityR, {
		props: { facilityOf },
		context: new Map<string, unknown>([
			['selectFacility', writable(null)],
			['facilityChoice', writable(undefined)]
		])
	});
};

beforeEach(() => nav.goto.mockClear());

describe('SelectFacilityR', () => {
	it('writes the chosen facility to the address', async () => {
		mount();
		await choose(m.ADDRESSBOOK_FACILITIES_PLACEHOLDER(), 'Cabinet Lafayette | 3 cours Lafayette | Lyon');
		await expect.poll(() => lastQuery(nav.goto)?.get('facility')).toBe('f-2');
	});

	it.each([
		['has neither name nor label', { name: '', label: '' }, 'Étbl. | 1 Rue Robert | Lyon'],
		['has a label and no name', { name: '', label: 'Cabinet Robert' }, 'Cabinet Robert | 1 Rue Robert | Lyon']
	])('names a chosen facility as the list does when it %s', async (_, names, text) => {
		const url = new SvelteURL('https://dev.santelyon3.fr/annuaire');
		state.url = url;
		render(SelectFacilityR, {
			props: {
				facilityOf: [{ uid: 'f-9', ...names, street: '1 Rue Robert', city: 'Lyon' }] as unknown as FacilityOf[]
			},
			context: new Map<string, unknown>([
				['selectFacility', writable(null)],
				['facilityChoice', writable(undefined)]
			])
		});
		url.searchParams.set('facility', 'f-9');
		await expect.element(page.getByText(text)).toBeVisible();
	});

	it('removes it from the address when cleared', async () => {
		mount('?facility=f-1');
		await clear();
		await expect.poll(() => lastQuery(nav.goto)?.has('facility')).toBe(false);
	});

	it('leaves the other filters in the address when cleared', async () => {
		mount('?facility=f-1&situation=s-1');
		await clear();
		await expect.poll(() => lastQuery(nav.goto)?.get('situation')).toBe('s-1');
	});
});
