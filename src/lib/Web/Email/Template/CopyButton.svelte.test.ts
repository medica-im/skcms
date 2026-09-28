/**
 * The copy button of the email template page.
 *
 * What it copies is what ends up in an email: an image's absolute address,
 * an <mj-image>, a {{ placeholder }}. It must copy exactly that text, say that
 * it did -- otherwise nothing on screen changes and people click again -- and
 * be a 44px target, for older users on phones.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import CopyButton from './CopyButton.svelte';

const URL = 'https://example.org/annuaire/media/email_images/o/a.png';

describe('CopyButton', () => {
	let written: string[];

	beforeEach(() => {
		written = [];
		vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(async (text: string) => {
			written.push(text);
		});
	});

	it('copies exactly the text it was given', async () => {
		render(CopyButton, { text: URL, label: "Copier l'adresse" });

		await page.getByRole('button', { name: "Copier l'adresse" }).click();

		await vi.waitFor(() => expect(written).toEqual([URL]));
	});

	it('says it copied, in place of its label', async () => {
		render(CopyButton, { text: URL, label: "Copier l'adresse" });

		await page.getByRole('button', { name: "Copier l'adresse" }).click();

		await expect.element(page.getByRole('button', { name: 'Copié' })).toBeVisible();
	});

	it('is at least 44px tall', async () => {
		render(CopyButton, { text: URL, label: "Copier l'adresse" });

		const button = page.getByRole('button', { name: "Copier l'adresse" });
		await expect.element(button).toBeVisible();
		expect(button.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
	});
});
