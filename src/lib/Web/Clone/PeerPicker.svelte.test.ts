/**
 * Choosing the source instance.
 *
 * The registry lists every peer there is, including those whose server is
 * stopped: choosing one sent the superuser to a page that crashed on its first
 * API call (2026-11-23). The picker says which answer now, and refuses the rest.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import PeerPicker from './PeerPicker.svelte';

const instances = [
	{ name: 'dev', display_name: 'Gadagne dev', origin: 'https://dev.example.org' },
	{ name: 'prod', display_name: 'Gadagne prod', origin: 'https://prod.example.org' }
];

const radio = (name: string) => screen.getByRole('radio', { name });

describe('PeerPicker', () => {
	it('lets an online instance be chosen, and marks it online', async () => {
		render(PeerPicker, {
			props: { instances, statuses: { dev: { online: true }, prod: { online: true } }, value: '' }
		});
		await expect.element(radio('Gadagne dev')).toBeEnabled();
		await expect.element(screen.getByText(m.CLONE_PEER_ONLINE()).first()).toBeVisible();
	});

	it('marks an offline instance, and cannot choose it', async () => {
		render(PeerPicker, {
			props: {
				instances,
				statuses: { dev: { online: false, status: 502 }, prod: { online: true } },
				value: ''
			}
		});
		await expect.element(radio('Gadagne dev')).toBeDisabled();
		await expect.element(radio('Gadagne prod')).toBeEnabled();
		await expect.element(screen.getByText(m.CLONE_PEER_OFFLINE(), { exact: true })).toBeVisible();
		await expect.element(screen.getByText(m.CLONE_PEER_OFFLINE_HINT())).toBeVisible();
	});

	it('waits to know before offering any instance', async () => {
		render(PeerPicker, { props: { instances, statuses: undefined, value: '' } });
		await expect.element(radio('Gadagne dev')).toBeDisabled();
		await expect.element(radio('Gadagne prod')).toBeDisabled();
		await expect.element(screen.getByText(m.CLONE_PEER_CHECKING()).first()).toBeVisible();
	});

	it('gives up a choice that has gone offline since', async () => {
		const { rerender } = await render(PeerPicker, {
			props: { instances, statuses: { dev: { online: true }, prod: { online: true } }, value: 'dev' }
		});
		await expect.element(radio('Gadagne dev')).toBeChecked();

		await rerender({
			instances,
			statuses: { dev: { online: false, status: 502 }, prod: { online: true } },
			value: 'dev'
		});
		await expect.element(radio('Gadagne dev')).not.toBeChecked();
	});

	it('groups the instances by environment, each under its own heading', async () => {
		const peers = [
			{ name: 'a-staging', display_name: 'Site A (staging)', origin: 'https://s.example.org' },
			{ name: 'a-prod', display_name: 'Site A (production)', origin: 'https://p.example.org' }
		];
		render(PeerPicker, {
			props: {
				instances: peers,
				statuses: { 'a-staging': { online: true }, 'a-prod': { online: true } },
				value: ''
			}
		});
		const production = screen.getByRole('group', { name: m.CLONE_PEER_GROUP_PRODUCTION() });
		const staging = screen.getByRole('group', { name: m.CLONE_PEER_GROUP_STAGING() });
		await expect.element(production.getByRole('radio', { name: 'Site A' })).toBeVisible();
		await expect.element(staging.getByRole('radio', { name: 'Site A' })).toBeVisible();
	});

	it('asks to check again, for an instance that has just been started', async () => {
		const onrecheck = vi.fn();
		render(PeerPicker, {
			props: {
				instances,
				statuses: { dev: { online: false, status: 502 }, prod: { online: true } },
				value: '',
				onrecheck
			}
		});
		await screen.getByRole('button', { name: m.CLONE_PEER_RECHECK() }).click();
		expect(onrecheck).toHaveBeenCalledOnce();
	});
});
