/**
 * A select tells the pointer it can be clicked.
 *
 * svelte-select hardcodes `cursor: default` on its input — which covers the
 * whole box — and on each option of the list, with no custom property to
 * override it. The hand comes from the shared stylesheet, so it is measured
 * with that stylesheet loaded as the root layout loads it.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Select from './Select.svelte';
import '../../app.postcss';
import '$lib/assets/css/svelte-select.css';

const items = [
	{ uid: 'a', label: 'Infirmier' },
	{ uid: 'b', label: 'Médecin généraliste' }
];

const cursor = (selector: string) => {
	const el = document.querySelector(selector);
	return el ? getComputedStyle(el).cursor : null;
};

describe('Select chevron', () => {
	it('shows the down arrow that marks a dropdown', async () => {
		render(Select, { props: { items, label: 'label', itemId: 'uid' } } as never);
		await expect.poll(() => document.querySelector('.svelte-select .chevron')).not.toBeNull();
	});

	it('leaves it out when a caller asks', async () => {
		render(Select, { props: { items, label: 'label', itemId: 'uid', showChevron: false } } as never);
		await expect.poll(() => document.querySelector('.svelte-select .indicators')).not.toBeNull();
		expect(document.querySelector('.svelte-select .chevron')).toBeNull();
	});
});

describe('Select cursor', () => {
	it('shows a hand over the box', async () => {
		render(Select, { props: { items, label: 'label', itemId: 'uid', searchable: true } } as never);
		await expect.poll(() => cursor('.svelte-select input')).toBe('pointer');
		// Around the input: the chevron lets the pointer through to the box.
		expect(cursor('.svelte-select')).toBe('pointer');
	});

	it('shows a hand over the options of the open list', async () => {
		render(Select, { props: { items, label: 'label', itemId: 'uid', listOpen: true } } as never);
		await expect.poll(() => cursor('.svelte-select-list .item')).toBe('pointer');
	});

	it('shows a hand over a chosen value of a multi-select', async () => {
		render(Select, {
			props: { items, label: 'label', itemId: 'uid', multiple: true, value: [items[0]] }
		} as never);
		await expect.poll(() => cursor('.svelte-select .multi-item')).toBe('pointer');
	});

	it('shows no hand over a disabled select', async () => {
		render(Select, { props: { items, label: 'label', itemId: 'uid', disabled: true } } as never);
		await expect.poll(() => cursor('.svelte-select input')).not.toBe('pointer');
	});
});
