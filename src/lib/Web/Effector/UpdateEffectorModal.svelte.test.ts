/**
 * Changing a person or a structure: the grammatical gender, by what their
 * entry does, as at creation. A profession offers feminine or masculine, says
 * why with its own two words and shows the one the entry page will show; a
 * person stored as neutral under a profession is asked to choose. A service or
 * an activity asks nothing, and keeps whatever gender was stored.
 */
import { describe, expect, it, vi } from 'vitest';
import '../../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const { form } = vi.hoisted(() => {
	const form = {};
	const hidden = (value: unknown) => ({ value, enumerable: false });
	Object.defineProperties(form, {
		fields: hidden(new Proxy({}, { get: () => ({ issues: () => [] }) })),
		pending: hidden(0),
		result: hidden(undefined),
		enhance: hidden(() => ({ method: 'POST' }))
	});
	return { form };
});
vi.mock('../../../effector.remote.ts', () => ({ updateEffector: { for: () => form } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidate: vi.fn() }));
vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/entry'),
		data: {
			labels: {
				't-nurse': { S: { F: 'infirmière', M: 'infirmier', N: 'infirmier' }, P: { F: 'infirmières', M: 'infirmiers', N: 'infirmiers' } },
				't-speech': { S: { F: 'orthophoniste', M: 'orthophoniste', N: 'orthophoniste' }, P: { F: 'orthophonistes', M: 'orthophonistes', N: 'orthophonistes' } }
			}
		}
	}
}));

import UpdateEffectorModal from './UpdateEffectorModal.svelte';

type Nature = 'profession' | 'service' | 'activity' | null;
const open = async (nature: Nature, gender: string | null, uid = 't-nurse') => {
	const data = {
		name: 'Alice Martin', label: 'Alice Martin', slug: 'alice-martin', gender, effector_uid: 'p1',
		effector_type: { uid, name: 'x', nature }
	};
	render(UpdateEffectorModal, { data: data as never });
	await page.getByRole('button', { name: 'Modifier' }).click();
};
const genderSelect = () => document.querySelector<HTMLSelectElement>('select[name="gender"]');
const send = () => page.getByRole('button', { name: 'Envoyer' });

describe('UpdateEffectorModal', () => {
	it('offers a profession’s person feminine or masculine, showing the word their gender gives', async () => {
		await open('profession', 'F');

		expect([...genderSelect()!.options].map((o) => o.text)).toEqual(['Féminin', 'Masculin']);
		await expect.element(page.getByText('Sur la fiche : infirmière', { exact: true })).toBeVisible();
		await expect.element(page.getByText('infirmière ou infirmier')).not.toBeInTheDocument();
	});

	it('asks a person stored as neutral under a profession to choose, saying why until they do', async () => {
		await open('profession', 'N');

		expect(genderSelect()!.value).toBe('');
		await expect
			.element(page.getByText('Pour écrire correctement la profession sur la fiche : infirmière ou infirmier.'))
			.toBeVisible();
		await expect.element(send()).toBeDisabled();
		await page.getByRole('option', { name: 'Masculin' }).click();
		await expect.element(send()).toBeEnabled();
		await expect.element(page.getByText('Sur la fiche : infirmier', { exact: true })).toBeVisible();
		await expect.element(page.getByText('infirmière ou infirmier')).not.toBeInTheDocument();
	});

	it('still asks for a profession with one word for both, showing it with the article: une orthophoniste, un orthophoniste', async () => {
		await open('profession', 'M', 't-speech');

		expect([...genderSelect()!.options].map((o) => o.text)).toEqual(['Féminin', 'Masculin']);
		await expect
			.element(page.getByText('Pour accorder ce qui désigne cette personne : une orthophoniste ou un orthophoniste.'))
			.toBeVisible();
		await expect.element(page.getByText('Sur la fiche', { exact: false })).not.toBeInTheDocument();
	});

	it('asks nothing for a service, and keeps the gender it had', async () => {
		await open('service', 'F');

		expect(genderSelect()).toBeNull();
		await expect.element(page.getByText('Genre grammatical')).not.toBeInTheDocument();
		expect(document.querySelector<HTMLInputElement>('input[name="gender"]')?.value).toBe('F');
		await expect.element(send()).toBeDisabled();
	});

	it('gives an activity without a gender the neutral', async () => {
		await open('activity', null);

		expect(genderSelect()).toBeNull();
		expect(document.querySelector<HTMLInputElement>('input[name="gender"]')?.value).toBe('N');
	});
});
