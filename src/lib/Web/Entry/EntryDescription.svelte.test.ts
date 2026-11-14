/**
 * An entry's description: what the service offers, for whom and on what terms.
 *
 * Shown on the entry page with its line breaks, and nothing at all when there is none.
 * In edit mode a pen opens a dialog to write or correct it; Save waits for a change,
 * an emptied text removes the description, and the backend has the last word on who may
 * (the entry's PATCH: its owner or creator, administrators, superusers).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import EntryDescription from './EntryDescription.svelte';
import { AA_TEXT, inScheme, legibility } from '$lib/testing/contrast.ts';
import '../../../app.postcss';

document.body.dataset.theme = 'wintry';

const remote = vi.hoisted(() => ({ patchCommand: vi.fn() }));
const nav = vi.hoisted(() => ({ invalidate: vi.fn() }));
vi.mock('../../../entry.remote', () => remote);
vi.mock('$app/navigation', () => nav);

const ALSM = "Permanences d'écoute gratuites et anonymes, sans rendez-vous.\nAssurées par un psychologue et un acteur de prévention.";

const mount = (description: string | null, editMode = true) =>
	render(EntryDescription, { props: { entryUid: 'e1', description, editMode } });

const pen = () => screen.getByRole('button', { name: m.ENTRY_DESCRIPTION_EDIT() });
const field = () => screen.getByRole('textbox');
const save = () => screen.getByRole('button', { name: m.ENTRY_DESCRIPTION_SAVE() });
const open = async () => {
	await pen().click();
	await expect.element(field()).toBeVisible();
};

beforeEach(() => {
	remote.patchCommand.mockReset();
	nav.invalidate.mockReset();
	nav.invalidate.mockResolvedValue(undefined);
});

describe('on the page', () => {
	it('shows the description with its line breaks', async () => {
		mount(ALSM, false);
		const text = screen.getByTestId('entry-description');
		await expect.element(text).toHaveTextContent('sans rendez-vous.');
		expect(getComputedStyle(text.element()).whiteSpace).toBe('pre-line');
		await expect.element(pen()).not.toBeInTheDocument();
	});

	it('shows nothing when there is none, outside edit mode', async () => {
		mount(null, false);
		await expect.element(screen.getByRole('heading', { name: m.ENTRY_DESCRIPTION_TITLE() })).not.toBeInTheDocument();
	});

	it('offers to write one in edit mode when there is none', async () => {
		mount(null);
		await expect.element(pen()).toBeVisible();
	});
});

describe('the dialog', () => {
	it('starts on the current text, which cannot be saved as it is', async () => {
		mount(ALSM);
		await open();
		await expect.element(field()).toHaveValue(ALSM);
		await expect.element(save()).toBeDisabled();
	});

	it('saves a changed text through the entry PATCH, confirms it and refreshes the page', async () => {
		remote.patchCommand.mockResolvedValue({ success: true, status: 200 });
		nav.invalidate.mockImplementation(() => new Promise(() => {}));
		mount(ALSM);
		await open();
		await field().fill('Permanences sans rendez-vous.');
		await save().click();
		expect(remote.patchCommand).toHaveBeenCalledWith({ entry: 'e1', description: 'Permanences sans rendez-vous.' });
		await expect.element(screen.getByText(m.ENTRY_DESCRIPTION_SAVED())).toBeVisible();
		expect(nav.invalidate).toHaveBeenCalledWith('entry:now');
	});

	it('removes the description when the text is emptied', async () => {
		remote.patchCommand.mockResolvedValue({ success: true, status: 200 });
		mount(ALSM);
		await open();
		await field().fill('  ');
		await save().click();
		expect(remote.patchCommand).toHaveBeenCalledWith({ entry: 'e1', description: null });
	});

	for (const [status, text] of [
		[403, m.ENTRY_DESCRIPTION_ERROR_NOT_ALLOWED()],
		[500, m.ENTRY_DESCRIPTION_ERROR_FAILED()]
	] as const) {
		it(`says so when the server answers ${status}`, async () => {
			remote.patchCommand.mockResolvedValue({ success: false, status });
			mount(ALSM);
			await open();
			await field().fill('Autre chose.');
			await save().click();
			await expect.element(screen.getByTestId('entry-description-refusal')).toHaveTextContent(text);
			expect(nav.invalidate).not.toHaveBeenCalled();
		});
	}

	for (const scheme of ['light', 'dark'] as const) {
		it(`reads at AA in ${scheme} mode: the text, the dialog title, the label and the buttons`, async () => {
			await inScheme(scheme, async () => {
				mount(ALSM);
				const shown = screen.getByTestId('entry-description').element();
				await open();
				await field().fill('Autre chose.');
				const parts = [
					shown,
					screen.getByRole('heading', { name: m.ENTRY_DESCRIPTION_DIALOG_TITLE() }).element(),
					screen.getByText(m.ENTRY_DESCRIPTION_LABEL()).element(),
					screen.getByRole('button', { name: m.CANCEL() }).element(),
					save().element()
				];
				const unreadable = parts
					.map((el) => ({ text: el.textContent?.trim(), ratio: legibility(el) }))
					.filter(({ ratio }) => ratio < AA_TEXT);
				expect(unreadable).toEqual([]);
			});
		});
	}
});
