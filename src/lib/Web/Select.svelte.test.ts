/**
 * A select tells the pointer it can be clicked.
 *
 * svelte-select hardcodes `cursor: default` on its input — which covers the
 * whole box — and on each option of the list, with no custom property to
 * override it. The hand comes from the shared stylesheet, so it is measured
 * with that stylesheet loaded as the root layout loads it.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { cdp, page, server, userEvent } from 'vitest/browser';
import * as m from '$msgs';
import Select from './Select.svelte';
import '../../app.postcss';
import '#lib/assets/css/svelte-select.css';

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
		render(Select, {
			props: { items, label: 'label', itemId: 'uid', showChevron: false }
		} as never);
		await expect.poll(() => document.querySelector('.svelte-select .indicators')).not.toBeNull();
		expect(document.querySelector('.svelte-select .chevron')).toBeNull();
	});
});

/**
 * A finger, not a mouse: CDP touch events are trusted, so the browser runs its
 * own tap sequence — pointer events, then the compatibility mouse events and
 * the focus change they carry — which no synthetic dispatch reproduces.
 */
const tap = async (el: Element) => {
	const frame = window.frameElement!.getBoundingClientRect();
	const scale = frame.width / window.innerWidth;
	const box = el.getBoundingClientRect();
	const point = {
		x: frame.left + (box.left + box.width / 2) * scale,
		y: frame.top + (box.top + box.height / 2) * scale
	};
	const session = cdp();
	await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
	await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};

describe.runIf(server.browser === 'chromium')('Select on a touch screen', () => {
	it('opens the list when the down arrow is tapped', async () => {
		render(Select, { props: { items, label: 'label', itemId: 'uid' } } as never);
		await expect.poll(() => document.querySelector('.svelte-select .chevron')).not.toBeNull();
		await tap(document.querySelector('.svelte-select .chevron')!);
		await expect.poll(() => document.querySelector('.svelte-select-list')).not.toBeNull();
		await new Promise((r) => setTimeout(r, 300));
		expect(document.querySelector('.svelte-select-list')).not.toBeNull();
	});

	it('opens the list when the box is tapped', async () => {
		render(Select, { props: { items, label: 'label', itemId: 'uid' } } as never);
		await expect.poll(() => document.querySelector('.svelte-select input')).not.toBeNull();
		await tap(document.querySelector('.svelte-select input')!);
		await expect.poll(() => document.querySelector('.svelte-select-list')).not.toBeNull();
		await new Promise((r) => setTimeout(r, 300));
		expect(document.querySelector('.svelte-select-list')).not.toBeNull();
	});

	const option = (label: string) =>
		[...document.querySelectorAll('.svelte-select-list .item')].find(
			(el) => el.textContent?.trim() === label
		)!;
	const inputFocused = () => document.activeElement === document.querySelector('.svelte-select input');

	async function tapOpen(props: Record<string, unknown> = {}) {
		const onchange = vi.fn();
		render(Select, { props: { items, label: 'label', itemId: 'uid', onchange, ...props } } as never);
		await expect.poll(() => document.querySelector('.svelte-select input')).not.toBeNull();
		await tap(document.querySelector('.svelte-select input')!);
		await expect.poll(() => document.querySelector('.svelte-select-list .item')).not.toBeNull();
		await expect.poll(inputFocused).toBe(true);
		return onchange;
	}

	it('lets go of the focus once a choice is tapped, so the keyboard goes away', async () => {
		const onchange = await tapOpen();
		await tap(option('Médecin généraliste'));
		await expect.poll(() => onchange.mock.calls.length).toBe(1);
		await expect.poll(inputFocused).toBe(false);
	});

	it('lets go of the focus once the choice is cleared with a tap, though svelte-select takes it back', async () => {
		await tapOpen({ value: items[0] });
		await expect.poll(() => document.querySelector('.svelte-select .clear-select')).not.toBeNull();
		await tap(document.querySelector('.svelte-select .clear-select')!);
		await new Promise((r) => setTimeout(r, 300));
		expect(inputFocused()).toBe(false);
	});

	it('keeps the focus in a multiple select, where one picks several in a row', async () => {
		await tapOpen({ multiple: true });
		await tap(option('Infirmier'));
		await new Promise((r) => setTimeout(r, 300));
		expect(inputFocused()).toBe(true);
	});
});

describe.runIf(server.browser === 'chromium')('Select fitted to a phone (fitOnPhone)', () => {
	const container = () => document.querySelector<HTMLElement>('.svelte-select')!;
	const room = () => container().style.getPropertyValue('--list-max-height');

	afterEach(() => page.viewport(1280, 720));

	async function tapped(props: Record<string, unknown>) {
		render(Select, { props: { items, label: 'label', itemId: 'uid', ...props } } as never);
		await expect.poll(() => document.querySelector('.svelte-select input')).not.toBeNull();
		await tap(document.querySelector('.svelte-select input')!);
	}

	it('gives the list the room left between the field and the bottom of what is visible', async () => {
		await page.viewport(360, 640);
		await tapped({ fitOnPhone: true });
		await expect.poll(room).toMatch(/px$/);
		expect(parseFloat(room())).toBeLessThanOrEqual(640 - container().getBoundingClientRect().bottom);
	});

	it('keeps its list open and its focus once the tap has landed', async () => {
		await page.viewport(360, 640);
		await tapped({ fitOnPhone: true });
		await expect.poll(() => document.querySelector('.svelte-select-list')).not.toBeNull();
		await new Promise((r) => setTimeout(r, 800));
		expect(document.querySelector('.svelte-select-list')).not.toBeNull();
		expect(document.activeElement).toBe(document.querySelector('.svelte-select input'));
	});

	it('is left alone without the option', async () => {
		await page.viewport(360, 640);
		await tapped({});
		await expect.poll(() => document.querySelector('.svelte-select-list')).not.toBeNull();
		await new Promise((r) => setTimeout(r, 600));
		expect(room()).toBe('');
	});

	it('is left alone on a wide screen', async () => {
		await page.viewport(1280, 720);
		await tapped({ fitOnPhone: true });
		await expect.poll(() => document.querySelector('.svelte-select-list')).not.toBeNull();
		await new Promise((r) => setTimeout(r, 600));
		expect(room()).toBe('');
	});
});

describe('Select with a mouse', () => {
	it('keeps the focus where a keyboard user left it once a choice is clicked', async () => {
		const onchange = vi.fn();
		const view = await render(Select, {
			props: { items, label: 'label', itemId: 'uid', onchange }
		} as never);
		await userEvent.click(document.querySelector<HTMLElement>('.svelte-select input')!);
		await userEvent.click(view.getByText('Infirmier', { exact: true }));
		await expect.poll(() => onchange.mock.calls.length).toBe(1);
		await new Promise((r) => setTimeout(r, 300));
		expect(document.activeElement).toBe(document.querySelector('.svelte-select input'));
	});
});

describe('Select with nothing to offer', () => {
	it('says so in the site language, not in svelte-select English', async () => {
		render(Select, { props: { items: [], listOpen: true } } as never);
		await expect
			.poll(() => document.querySelector('.svelte-select-list')?.textContent?.trim())
			.toBe(m.NO_OPTIONS());
		expect(document.querySelector('.svelte-select-list .empty')).toBeNull();
	});
});

describe('Select callbacks', () => {
	it('hands the chosen item itself to onchange', async () => {
		const onchange = vi.fn();
		// Exact: once focused, the screen-reader announcement names the hovered option too.
		const view = await render(Select, {
			props: { items, label: 'label', itemId: 'uid', listOpen: true, onchange }
		} as never);
		await userEvent.click(view.getByText('Médecin généraliste', { exact: true }));
		await expect.poll(() => onchange.mock.calls.length).toBe(1);
		expect(onchange.mock.calls[0][0]).toMatchObject(items[1]);
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
