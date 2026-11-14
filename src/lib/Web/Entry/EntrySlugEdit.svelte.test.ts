/**
 * Changing an entry's address (its slug) from its page, in edit mode.
 *
 * Offered only to who may (the owner, administrators, superusers: the backend says so,
 * per user). The field checks the address as it is typed, offers free ones when it is
 * taken, and Save waits for an address the server just said is free. The old address
 * redirects to the new one, which the dialog says; the page then moves to the new slug.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import EntrySlugEdit from './EntrySlugEdit.svelte';
import { AA_TEXT, inScheme, legibility } from '$lib/testing/contrast.ts';
import '../../../app.postcss';

document.body.dataset.theme = 'wintry';

const remote = vi.hoisted(() => ({ checkEntrySlug: vi.fn(), changeEntrySlug: vi.fn() }));
const nav = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('../../../entry.remote', () => remote);
vi.mock('$app/navigation', () => nav);
vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('$app/state', () => ({ page: { url: new URL('https://dev.santelyon3.fr/e/le-mas-gem-69') } }));

const CURRENT = 'le-mas-gem-69';
const free = (slug: string) => ({ slug, free: true, reason: null, suggestions: [] });
const taken = (slug: string) => ({ slug, free: false, reason: 'taken', suggestions: ['le-mas-association-69', 'le-mas-lyon'] });

const mount = (permission: { allowed: boolean } | null = { allowed: true }) =>
	render(EntrySlugEdit, { props: { entryUid: 'e1', slug: CURRENT, permission } });

const open = async () => {
	await screen.getByRole('button', { name: m.ENTRY_SLUG_EDIT() }).click();
	await expect.element(screen.getByRole('textbox')).toBeVisible();
};
const type = async (text: string) => {
	const field = screen.getByRole('textbox');
	await field.fill(text);
};
const save = () => screen.getByRole('button', { name: m.ENTRY_SLUG_SAVE() });

beforeEach(() => {
	remote.checkEntrySlug.mockReset();
	remote.changeEntrySlug.mockReset();
	nav.goto.mockReset();
	remote.checkEntrySlug.mockImplementation(async ({ slug }: { slug: string }) => free(slug));
});

describe('who sees the pen', () => {
	it('nobody without a permission, or without the right', async () => {
		mount(null);
		await expect.element(screen.getByRole('button', { name: m.ENTRY_SLUG_EDIT() })).not.toBeInTheDocument();
	});

	it('not someone who may not change it', async () => {
		mount({ allowed: false });
		await expect.element(screen.getByRole('button', { name: m.ENTRY_SLUG_EDIT() })).not.toBeInTheDocument();
	});

	it('someone who may', async () => {
		mount();
		await expect.element(screen.getByRole('button', { name: m.ENTRY_SLUG_EDIT() })).toBeVisible();
	});
});

describe('the dialog', () => {
	it('starts on the current address, which cannot be saved as it is', async () => {
		mount();
		await open();
		await expect.element(screen.getByRole('textbox')).toHaveValue(CURRENT);
		await expect.element(save()).toBeDisabled();
	});

	it('checks what is typed, then allows saving it and says the old address redirects', async () => {
		mount();
		await open();
		await type('le-mas-association-69');
		await expect.element(screen.getByTestId('slug-status')).toHaveAttribute('data-status', 'free');
		expect(remote.checkEntrySlug).toHaveBeenCalledWith({ uid: 'e1', slug: 'le-mas-association-69' });
		await expect.element(save()).toBeEnabled();
		await expect.element(screen.getByTestId('slug-warning')).toHaveTextContent(m.ENTRY_SLUG_REDIRECT());
	});

	it('refuses a taken address in the entry\'s words and offers free ones, which fill the field', async () => {
		remote.checkEntrySlug.mockImplementation(async ({ slug }: { slug: string }) =>
			slug === 'le-mas-lyon' ? free(slug) : taken(slug)
		);
		mount();
		await open();
		await type('unafam-association-69');
		await expect.element(screen.getByTestId('slug-status')).toHaveTextContent(m.ENTRY_SLUG_TAKEN());
		await expect.element(save()).toBeDisabled();
		await screen.getByRole('button', { name: 'le-mas-lyon' }).click();
		await expect.element(screen.getByRole('textbox')).toHaveValue('le-mas-lyon');
		await expect.element(save()).toBeEnabled();
	});

	it('saves, then goes to the new address', async () => {
		remote.changeEntrySlug.mockResolvedValue({ success: true, status: 200, slug: 'le-mas-association-69' });
		mount();
		await open();
		await type('le-mas-association-69');
		await expect.element(save()).toBeEnabled();
		await save().click();
		expect(remote.changeEntrySlug).toHaveBeenCalledWith({ uid: 'e1', slug: 'le-mas-association-69' });
		await expect.poll(() => nav.goto.mock.lastCall?.[0]).toBe('/e/le-mas-association-69');
	});

	it('confirms the change, as every widget that saves does', async () => {
		remote.changeEntrySlug.mockResolvedValue({ success: true, status: 200, slug: 'le-mas-association-69' });
		nav.goto.mockImplementation(() => new Promise(() => {}));
		mount();
		await open();
		await type('le-mas-association-69');
		await expect.element(save()).toBeEnabled();
		await save().click();
		await expect.element(screen.getByText(m.ENTRY_SLUG_SAVED())).toBeVisible();
	});

	for (const [code, status, text] of [
		['taken', 409, m.ENTRY_SLUG_TAKEN()],
		[undefined, 403, m.ENTRY_SLUG_ERROR_NOT_ALLOWED()],
		[undefined, 500, m.ENTRY_SLUG_ERROR_FAILED()]
	] as const) {
		it(`says so when the server answers ${status}${code ? ` (${code})` : ''}`, async () => {
			remote.changeEntrySlug.mockResolvedValue({ success: false, status, code });
			mount();
			await open();
			await type('le-mas-association-69');
			await expect.element(save()).toBeEnabled();
			await save().click();
			await expect.element(screen.getByTestId('entry-slug-refusal')).toHaveTextContent(text);
			expect(nav.goto).not.toHaveBeenCalled();
		});
	}

	for (const scheme of ['light', 'dark'] as const) {
		it(`reads at AA in ${scheme} mode: the title, the current address, the hint and the buttons`, async () => {
			await inScheme(scheme, async () => {
				mount();
				await open();
				await type('le-mas-association-69');
				await expect.element(save()).toBeEnabled();
				const parts = [
					screen.getByRole('heading', { name: m.ENTRY_SLUG_TITLE() }),
					screen.getByText(m.ENTRY_SLUG_CURRENT()),
					screen.getByTestId('entry-slug-url'),
					screen.getByRole('button', { name: m.CANCEL() }),
					save()
				];
				const unreadable = parts
					.map((part) => part.element())
					.map((el) => ({ text: el.textContent?.trim(), ratio: legibility(el) }))
					.filter(({ ratio }) => ratio < AA_TEXT);
				expect(unreadable).toEqual([]);
			});
		});
	}
});
