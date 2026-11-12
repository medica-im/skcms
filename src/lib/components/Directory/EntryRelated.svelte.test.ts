/**
 * A service names the entry that runs it, and a porteur lists its services:
 * links to their pages, with their type, so the page says who is behind a help line
 * without putting it in the team.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import EntryRelated from './EntryRelated.svelte';
import '../../../app.postcss';

vi.mock('$app/paths', () => ({ base: '' }));

const MGEN = { uid: 'u1', slug: 'mgen-69', name: 'MGEN Action sanitaire et sociale', label: 'MGEN', effector_type: 'organisme mutualiste' };
const ESM = { uid: 'u2', slug: 'esm-lyon-69', name: 'Établissement de santé mentale', label: null, effector_type: 'hôpital de jour' };

describe('EntryRelated', () => {
	it('shows nothing for an entry with no porteur and no services', async () => {
		render(EntryRelated, { props: {} });
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_PORTEUR())).not.toBeInTheDocument();
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_SERVICES())).not.toBeInTheDocument();
	});

	it('links the porteur to its page', async () => {
		render(EntryRelated, { props: { runBy: MGEN } });
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_PORTEUR())).toBeVisible();
		await expect.element(screen.getByRole('link', { name: /MGEN/ })).toHaveAttribute('href', '/e/mgen-69');
	});

	it('lists the services with their type, by name when they have no label', async () => {
		render(EntryRelated, { props: { services: [ESM] } });
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_SERVICES())).toBeVisible();
		await expect
			.element(screen.getByRole('link', { name: /Établissement de santé mentale/ }))
			.toHaveAttribute('href', '/e/esm-lyon-69');
		await expect.element(screen.getByText(/hôpital de jour/)).toBeVisible();
	});
});
