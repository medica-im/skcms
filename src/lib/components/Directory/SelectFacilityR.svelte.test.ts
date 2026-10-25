/**
 * The facility filter of the address book: the URL is the state. Choosing a
 * facility writes its uid to `?facility=` and clearing removes the parameter,
 * leaving the other filters as they were.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { writable } from 'svelte/store';
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
