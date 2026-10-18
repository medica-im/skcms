/**
 * The type selector when the filters leave a single type.
 *
 * Opening a list of one to "choose" it changes nothing, so that type is shown
 * as a fact: read-only, legible, without a clear button — and not chosen.
 * Nothing reaches the selection store or the URL, so widening the other
 * filters again brings back an ordinary, empty selector. A visitor who taps it
 * anyway is told why it does not open; a screen reader hears it with the type.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen, userEvent } from 'vitest/browser';
import { get, writable } from 'svelte/store';
import SelectCategoriesR from './SelectCategoriesR.svelte';
import Select from '$lib/Web/Select.svelte';
import { IPA, NURSE } from '$lib/store/directoryStore.fixtures.ts';
import '../../../app.postcss';
// As the root layout loads it: the selects' colours come from here and the theme.
import '$lib/assets/css/svelte-select.css';

document.body.dataset.theme = 'wintry';

const nav = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => nav);
vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('$app/state', () => ({
	page: {
		data: { directory: { setting: { path: '/annuaire' } } },
		url: new URL('https://dev.santelyon3.fr/annuaire')
	}
}));

const ONLY_ONE = 'Seule profession dans cette sélection';

function mount(categoryOf: (typeof IPA)[]) {
	const selectCategories = writable<string[]>([]);
	const props = $state({ categoryOf });
	render(SelectCategoriesR, {
		props,
		context: new Map<string, unknown>([
			['selectCategories', selectCategories],
			['selCatVal', writable(null)],
			['selectFacility', writable(null)],
			['directoryRedirect', writable(false)]
		])
	});
	return { props, selectCategories };
}

const selected = () => document.querySelector('.selected-item')?.textContent?.trim() ?? null;
const input = () => document.querySelector<HTMLInputElement>('.svelte-select input');
const disabled = () => input()?.disabled ?? null;
/** What a screen reader reads after the field: its aria-describedby text. */
const description = () => {
	const id = input()?.getAttribute('aria-describedby');
	return id ? (document.getElementById(id)?.textContent?.trim() ?? null) : null;
};

/** The first opaque background at or above `el`; the page's own when none is. */
const paintedBehind = (el: Element): string => {
	for (let node: Element | null = el; node; node = node.parentElement) {
		const bg = getComputedStyle(node).backgroundColor;
		if (!/rgba\(.*,\s*0\)$/.test(bg) && bg !== 'transparent') return bg;
	}
	return getComputedStyle(document.body).backgroundColor;
};
/** WCAG contrast ratio of two `rgb()` colours. */
const contrast = (a: string, b: string): number => {
	const lum = (c: string) => {
		const [r, g, bl] = (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map((v) => {
			const s = v / 255;
			return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
	};
	const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

describe('SelectCategoriesR with a single type offered', () => {
	it('shows that type as a fact, read-only, without choosing it', async () => {
		const { selectCategories } = mount([IPA]);
		await expect.poll(selected).toBe('infirmier en pratique avancée');
		await expect.poll(disabled).toBe(true);
		expect(document.querySelector('.clear-select')).toBeNull();
		expect(get(selectCategories)).toEqual([]);
		expect(nav.goto).not.toHaveBeenCalled();
	});

	it('shows no down arrow, since there is no list to open', async () => {
		mount([IPA]);
		await expect.poll(selected).toBe('infirmier en pratique avancée');
		expect(document.querySelector('[data-testid="only-type"] .chevron')).toBeNull();
	});

	it('looks like a chosen value, not like a greyed-out control', async () => {
		mount([IPA]);
		const item = { uid: 'x', label: 'un choix', name: 'un choix' };
		const chosen = document.createElement('div');
		document.body.appendChild(chosen);
		render(Select, { target: chosen, props: { items: [item], value: item, label: 'label', itemId: 'uid' } } as never);
		// A disabled select is told apart by its box: darker background, paler border.
		const box = (root: Element) => {
			const el = root.querySelector('.svelte-select .svelte-select, .svelte-select');
			const inner = root.querySelector('[data-testid="only-type"] .svelte-select') ?? el;
			return inner ? `${getComputedStyle(inner).backgroundColor} / ${getComputedStyle(inner).borderColor}` : null;
		};
		await expect.poll(() => box(chosen)).not.toBeNull();
		await expect.poll(() => box(screen.getByTestId('only-type').element().parentElement!)).toBe(box(chosen));
	});

	it('tells a visitor who taps it why it does not open', async () => {
		mount([IPA]);
		await expect.element(screen.getByRole('status')).not.toBeInTheDocument();
		await userEvent.click(screen.getByTestId('only-type'));
		await expect.element(screen.getByRole('status')).toHaveTextContent(ONLY_ONE);
	});

	for (const scheme of ['light', 'dark'] as const) {
		it(`tells it legibly in ${scheme} mode`, async () => {
			document.documentElement.classList.toggle('dark', scheme === 'dark');
			try {
				mount([IPA]);
				await userEvent.click(screen.getByTestId('only-type'));
				const status = screen.getByRole('status');
				await expect.element(status).toHaveTextContent(ONLY_ONE);
				const text = getComputedStyle(status.element()).color;
				await expect.poll(() => contrast(text, paintedBehind(status.element()))).toBeGreaterThanOrEqual(4.5);
			} finally {
				document.documentElement.classList.remove('dark');
			}
		});
	}

	it('says it to a screen reader along with the type', async () => {
		mount([IPA]);
		await expect.poll(description).toBe(ONLY_ONE);
	});

	it('is an ordinary, empty selector when several types are offered', async () => {
		mount([IPA, NURSE]);
		await expect.poll(disabled).toBe(false);
		expect(selected()).toBeNull();
	});

	it('follows the offered types as the other filters narrow and widen them', async () => {
		const { props, selectCategories } = mount([IPA, NURSE]);
		await expect.poll(disabled).toBe(false);
		props.categoryOf = [IPA];
		await expect.poll(disabled).toBe(true);
		props.categoryOf = [IPA, NURSE];
		await expect.poll(disabled).toBe(false);
		expect(selected()).toBeNull();
		expect(get(selectCategories)).toEqual([]);
	});
});
