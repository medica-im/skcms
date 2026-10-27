/**
 * A contact person on a public page: who they are, and how to reach them.
 *
 * The card shows the phones and emails the backend returned for this visitor
 * and nothing else. The backend strips each one the visitor's role may not
 * see — an anonymous visitor typically gets empty lists — so the
 * card must render cleanly with none of them, and must not depend on the
 * entry page's edit-mode context, which a public page does not provide.
 */
import { describe, it, expect, vi } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { EntryFull } from '$lib/store/directoryStoreInterface';

import ContactPersonCard from './ContactPersonCard.svelte';

const anonymousView = {
	uid: 'e1',
	name: 'Camille Bordagaray',
	effector_type: { label: 'coordinatrice' },
	avatar: null,
	phones: [],
	emails: [],
	socialnetworks: null
} as unknown as EntryFull;

/** A real, loadable 1×1 picture: a path the test server cannot serve would fall back. */
const PICTURE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const staffView = {
	...anonymousView,
	avatar: { sm: PICTURE, lg: '', raw: '' },
	phones: [
		{ id: 1, phone: '04 78 00 00 01', type: 'W' },
		{ id: 2, phone: '06 00 00 00 02', type: 'M' }
	],
	emails: [{ id: 3, email: 'coordination@example.org', roles: [] }],
	socialnetworks: [
		{ id: 4, handle: 'cpts', url: 'https://www.linkedin.com/company/cpts', type: 'LI', type_display: 'LinkedIn', roles: [] }
	]
} as unknown as EntryFull;

const links = () => [...document.querySelectorAll<HTMLAnchorElement>('a')].map((a) => a.getAttribute('href'));

describe('ContactPersonCard', () => {
	it('names the person and their job', async () => {
		render(ContactPersonCard, { data: anonymousView });

		await expect.element(page.getByText('coordinatrice')).toBeVisible();
		await expect.element(page.getByText('Camille Bordagaray')).toBeVisible();
	});

	it('puts the name above the job', async () => {
		render(ContactPersonCard, { data: anonymousView });

		const name = page.getByText('Camille Bordagaray').element();
		const job = page.getByText('coordinatrice').element();
		expect(name.compareDocumentPosition(job) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('shows their own small picture when they have one', async () => {
		render(ContactPersonCard, { data: staffView });

		const picture = page.getByRole('img', { name: /Camille Bordagaray/ });
		await expect.element(picture).toBeVisible();
		expect(picture.element().getAttribute('src')).toBe(PICTURE);
	});

	it('falls back to the placeholder when their picture cannot be loaded', async () => {
		const broken = { ...staffView, avatar: { sm: '/media/profile_images/gone.webp', lg: '', raw: '' } };
		render(ContactPersonCard, { data: broken as unknown as EntryFull });

		const picture = page.getByRole('img', { name: /Camille Bordagaray/ });
		await vi.waitFor(() =>
			expect(picture.element().getAttribute('src')).toContain('default_profile_picture')
		);
	});

	it('shows the placeholder picture when there is none to show', async () => {
		render(ContactPersonCard, { data: anonymousView });

		const picture = page.getByRole('img', { name: /Camille Bordagaray/ });
		await expect.element(picture).toBeVisible();
		expect(picture.element().getAttribute('src')).toContain('default_profile_picture');
	});

	it('lists every phone and email it was given, outside the entry page', async () => {
		render(ContactPersonCard, { data: staffView });

		await expect.element(page.getByText('04 78 00 00 01')).toBeVisible();
		expect(links()).toEqual(
			expect.arrayContaining(['tel:04 78 00 00 01', 'tel:06 00 00 00 02', 'mailto:coordination@example.org'])
		);
	});

	it('leaves social networks out, even when the visitor may see them', async () => {
		render(ContactPersonCard, { data: staffView });

		await expect.element(page.getByText('04 78 00 00 01')).toBeVisible();
		expect(links()).not.toContain('https://www.linkedin.com/company/cpts');
	});

	it('shows no contact details when the visitor may see none', async () => {
		render(ContactPersonCard, { data: anonymousView });

		await expect.element(page.getByText('Camille Bordagaray')).toBeVisible();
		expect(links()).toEqual([]);
	});
});
