/**
 * The tag selectors of the address book, in a real browser.
 *
 * A tag only makes sense for the types it is connected to (the IPA mentions,
 * for "infirmier en pratique avancée"). So a category's selector shows once
 * its type is chosen, or, with no type chosen, as soon as every type the type
 * selector offers is connected to it: a whole directory of IPAs, or a commune
 * whose only practice is an IPA's. The rule itself is pinned in
 * directoryStore.test.ts (tagCategoriesShownF); these pin that it reaches the
 * screen and follows the offered types as the other filters change them.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen, userEvent } from 'vitest/browser';
import { get, writable } from 'svelte/store';
import SelectTagsR from './SelectTagsR.svelte';
import type { Tag } from '$lib/store/directoryStoreInterface';
import { makeEntry, NURSE, IPA, IPA_MENTIONS } from '$lib/store/directoryStore.fixtures.ts';
import '../../../app.postcss';

const entries = [
	makeEntry({ uid: 'ipa-1', type: IPA, tags: IPA_MENTIONS.slice(0, 3) }),
	makeEntry({ uid: 'ipa-2', type: IPA, tags: IPA_MENTIONS.slice(3) }),
	makeEntry({ uid: 'nurse', type: NURSE, tags: null })
];

vi.mock('$app/state', () => ({
	page: {
		get data() {
			return { entries };
		},
		url: new URL('https://dev.unipa.fr/annuaire/')
	}
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const stores = () => ({ selectCategories: writable<string[]>([]), selectedTags: writable<Tag[] | null>(null) });
const mount = (categoryOf: (typeof IPA)[], tagOf: Tag[] = IPA_MENTIONS, s = stores()) => ({
	s,
	view: render(SelectTagsR, {
		props: { tagOf, categoryOf },
		context: new Map<string, unknown>([
			['selectCategories', s.selectCategories],
			['selectedTags', s.selectedTags]
		])
	})
});
const mentionSelect = () => screen.getByPlaceholder('mention');
/** The options the open list shows, as text. */
const shown = () => [...document.querySelectorAll('.list-item')].map((e) => e.textContent?.trim() ?? '');

describe('SelectTagsR', () => {
	it('shows the mentions with no type chosen when only IPAs are offered', async () => {
		mount([IPA]);
		await expect.element(mentionSelect()).toBeVisible();
		await userEvent.click(mentionSelect());
		await expect.poll(shown).toEqual(IPA_MENTIONS.map((t) => t.labelShort));
	});

	it('selects the mention chosen in the list, and shows it chosen', async () => {
		const { s } = mount([IPA]);
		await userEvent.click(mentionSelect());
		await expect.poll(shown).toContain('PCS');
		await userEvent.click(screen.getByText('PCS', { exact: true }));
		await expect.poll(() => get(s.selectedTags)?.map((t) => t.labelShort)).toEqual(['PCS']);
		await expect.poll(() => document.querySelector('.selected-item')?.textContent?.trim()).toBe('PCS');
	});

	it('keeps them hidden while infirmiers are offered too, until IPA is chosen', async () => {
		const { s } = mount([IPA, NURSE]);
		await expect.element(mentionSelect()).not.toBeInTheDocument();
		s.selectCategories.set([IPA.uid]);
		await expect.element(mentionSelect()).toBeVisible();
	});

	it('stays hidden with IPA chosen when the filtered entries carry no mention, as in a commune whose IPA has none', async () => {
		const { s } = mount([IPA], []);
		s.selectCategories.set([IPA.uid]);
		await new Promise((r) => setTimeout(r, 300));
		await expect.element(mentionSelect()).not.toBeInTheDocument();
	});

	it('follows the offered types as the other filters narrow and widen them', async () => {
		// Reactive props: changing categoryOf here is a commune filter changing it upstream.
		const props = $state({ tagOf: IPA_MENTIONS, categoryOf: [IPA, NURSE] });
		const s = stores();
		render(SelectTagsR, {
			props,
			context: new Map<string, unknown>([
				['selectCategories', s.selectCategories],
				['selectedTags', s.selectedTags]
			])
		});
		await expect.element(mentionSelect()).not.toBeInTheDocument();
		props.categoryOf = [IPA];
		await expect.element(mentionSelect()).toBeVisible();
		props.categoryOf = [IPA, NURSE];
		await expect.element(mentionSelect()).not.toBeInTheDocument();
	});
});
