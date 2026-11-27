/**
 * The tags offered on the creation page as soon as an occupation is chosen.
 *
 * Only the categories of that occupation, with their tags shown at once: no
 * category to pick first. Skipping is allowed, confirming is the button that
 * stands out.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import * as m from '$msgs';
import EntryTypeTags from './EntryTypeTags.svelte';
import { getTagCategories, getTags } from '../../../tag.remote.ts';
import '../../../app.postcss';
import '#lib/assets/css/svelte-select.css';

vi.mock('../../../tag.remote.ts', () => ({
	postEntryTag: vi.fn(),
	getTagCategories: vi.fn(),
	getTags: vi.fn()
}));

const IPA = 'type-ipa';

beforeEach(() => {
	vi.mocked(getTagCategories).mockResolvedValue([
		{ uid: 'cat-ipa', name: 'mention_ipa', label: 'Mention IPA', labelShort: 'IPA', effector_types: [IPA] },
		{ uid: 'cat-other', name: 'other', label: 'Autre catégorie', labelShort: 'Autre', effector_types: ['x'] }
	] as never);
	vi.mocked(getTags).mockResolvedValue([
		{ uid: 'pcs', name: 'pcs', label: 'Pathologies chroniques stabilisées', labelShort: 'PCS', category: 'cat-ipa' },
		{ uid: 'onco', name: 'onco', label: 'Oncologie', labelShort: 'Oncologie', category: 'cat-ipa' },
		{ uid: 'stray', name: 'stray', label: 'Ailleurs', labelShort: 'Ailleurs', category: 'cat-other' }
	] as never);
});

const confirm = () => page.getByRole('button', { name: m.TAGS_AT_CREATION_CONFIRM() });
const skip = () => page.getByRole('button', { name: m.TAGS_AT_CREATION_SKIP() });

const offered = () =>
	[...document.querySelectorAll('.svelte-select-list .item')].map((e) => e.textContent?.trim());
const open = () =>
	expect
		.poll(async () => {
			await userEvent.click(page.getByPlaceholder(m.SELECT_PLACEHOLDER()));
			return offered().length;
		})
		.toBeGreaterThan(0);
const pick = async (label: string) => {
	await open();
	const item = [...document.querySelectorAll<HTMLElement>('.svelte-select-list .item')].find(
		(e) => e.textContent?.trim() === label
	)!;
	await userEvent.click(item);
};

describe("an occupation's tags at creation", () => {
	it("shows its category's tags at once, without a category to choose", async () => {
		render(EntryTypeTags, { props: { effectorType: IPA } } as never);
		await expect.element(page.getByText('Mention IPA')).toBeVisible();
		expect(document.querySelectorAll('.svelte-select')).toHaveLength(1);
		await open();
		expect(offered()).toEqual(['PCS', 'Oncologie']);
	});

	it('cannot be confirmed before a tag is chosen', async () => {
		render(EntryTypeTags, { props: { effectorType: IPA } } as never);
		await expect.element(confirm()).toBeDisabled();
		await pick('PCS');
		await expect.element(confirm()).toBeEnabled();
	});

	it('once confirmed, lists the tags chosen', async () => {
		render(EntryTypeTags, { props: { effectorType: IPA } } as never);
		await pick('Oncologie');
		await confirm().click();
		await expect.element(page.getByText('Oncologie')).toBeVisible();
		expect(document.querySelector('.svelte-select')).toBeNull();
		await expect.element(page.getByRole('button', { name: m.EDIT() })).toBeVisible();
	});

	it('can be skipped, and says no tag was given', async () => {
		render(EntryTypeTags, { props: { effectorType: IPA } } as never);
		await skip().click();
		await expect.element(page.getByText(m.TAGS_AT_CREATION_NONE())).toBeVisible();
		expect(document.querySelector('.svelte-select')).toBeNull();
	});

	it('asks nothing of an occupation without categories', async () => {
		const { container } = await render(EntryTypeTags, { props: { effectorType: 'type-kine' } } as never);
		await vi.waitFor(() => expect(getTags).toHaveBeenCalled());
		await new Promise((r) => setTimeout(r, 50));
		expect(container.textContent?.trim()).toBe('');
	});

	it('says so when the tags cannot be loaded, and can still be skipped', async () => {
		vi.mocked(getTags).mockRejectedValue(new Error('down'));
		render(EntryTypeTags, { props: { effectorType: IPA } } as never);
		await expect.element(page.getByText(m.TAGS_UNAVAILABLE())).toBeVisible();
		await expect.element(skip()).toBeEnabled();
	});

	it('has buttons a finger can hit and text that can be read', async () => {
		render(EntryTypeTags, { props: { effectorType: IPA } } as never);
		await expect.element(confirm()).toBeVisible();
		for (const button of [confirm(), skip()]) {
			const el = button.element() as HTMLElement;
			expect(el.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
			expect(parseFloat(getComputedStyle(el).fontSize)).toBeGreaterThanOrEqual(16);
		}
		const help = page.getByText(m.TAGS_AT_CREATION_HELP()).element() as HTMLElement;
		expect(parseFloat(getComputedStyle(help).fontSize)).toBeGreaterThanOrEqual(16);
	});
});
