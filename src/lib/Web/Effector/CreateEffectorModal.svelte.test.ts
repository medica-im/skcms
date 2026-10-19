/**
 * Creating the person or structure of an entry: its grammatical gender is
 * asked for only when the entry's type is a profession, whose label agrees
 * with it, and then only feminine or masculine, saying why with the
 * profession's own two words (infirmière ou infirmier) and, once chosen, the
 * one the entry page will show. A service or an activity has one form whoever
 * provides it: no question, and the neutral is sent.
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
		result: hidden(undefined)
	});
	return { form };
});
vi.mock('../../../effector.remote.ts', () => ({ createEffector: { for: () => form } }));
vi.mock('$app/state', () => ({
	page: {
		data: {
			organization: { name: 'CPTS', uid: 'org', formatted_name: 'la CPTS', category: { name: 'cpts' } },
			labels: {
				't-nurse': { S: { F: 'infirmière', M: 'infirmier', N: 'infirmier' }, P: { F: 'infirmières', M: 'infirmiers', N: 'infirmiers' } },
				't-speech': { S: { F: 'orthophoniste', M: 'orthophoniste', N: 'orthophoniste' }, P: { F: 'orthophonistes', M: 'orthophonistes', N: 'orthophonistes' } }
			}
		}
	}
}));

import CreateEffectorModal from './CreateEffectorModal.svelte';

type Nature = 'profession' | 'service' | 'activity' | null;
const open = async (nature: Nature, value = 't-nurse') => {
	render(CreateEffectorModal, { effector: undefined, memberships: [], effectorType: { label: 'x', value, nature } });
	await page.getByRole('button', { name: 'Créer une personne' }).click();
};
const genderSelect = () => document.querySelector<HTMLSelectElement>('select[name="gender"]');
const send = () => page.getByRole('button', { name: 'Envoyer' });

describe('CreateEffectorModal', () => {
	it('asks a profession’s person to be feminine or masculine, never neutral', async () => {
		await open('profession');

		expect([...genderSelect()!.options].map((o) => o.text)).toEqual(['Féminin', 'Masculin']);
		await page.getByRole('textbox').first().fill('Alice Martin');
		await page.getByText('Oui').click();
		await expect.element(send()).toBeDisabled();
		await page.getByRole('option', { name: 'Féminin' }).click();
		await expect.element(send()).toBeEnabled();
	});

	it('says why, with the profession’s own two words', async () => {
		await open('profession');

		await expect
			.element(page.getByText('Pour écrire correctement la profession sur la fiche : infirmière ou infirmier.'))
			.toBeVisible();
	});

	it('shows the word the entry page will show once a gender is chosen', async () => {
		await open('profession');

		await page.getByRole('option', { name: 'Masculin' }).click();
		await expect.element(page.getByText('Sur la fiche : infirmier', { exact: true })).toBeVisible();
		await expect.element(page.getByText('infirmière ou infirmier')).not.toBeInTheDocument();
		await page.getByRole('option', { name: 'Féminin' }).click();
		await expect.element(page.getByText('Sur la fiche : infirmière', { exact: true })).toBeVisible();
	});

	it('still asks for a profession with one word for both, showing it with the article: une orthophoniste, un orthophoniste', async () => {
		await open('profession', 't-speech');

		expect([...genderSelect()!.options].map((o) => o.text)).toEqual(['Féminin', 'Masculin']);
		await expect
			.element(page.getByText('Pour accorder ce qui désigne cette personne : une orthophoniste ou un orthophoniste.'))
			.toBeVisible();
		await page.getByRole('option', { name: 'Féminin' }).click();
		await expect.element(page.getByText('Sur la fiche', { exact: false })).not.toBeInTheDocument();
		await expect.element(page.getByText('orthophoniste ou orthophoniste')).not.toBeInTheDocument();
	});

	it('says why without examples for a profession it has no words for', async () => {
		await open('profession', 't-unknown');

		await expect.element(page.getByText('Pour écrire correctement la profession sur la fiche.')).toBeVisible();
	});

	it('asks nothing for a service, and sends the neutral', async () => {
		await open('service');

		expect(genderSelect()).toBeNull();
		await expect.element(page.getByText('Genre grammatical')).not.toBeInTheDocument();
		expect(document.querySelector<HTMLInputElement>('input[name="gender"]')?.value).toBe('N');
		await page.getByRole('textbox').first().fill('Pharmacie du Centre');
		await page.getByText('Oui').click();
		await expect.element(send()).toBeEnabled();
	});

	it('asks nothing for an activity either', async () => {
		await open('activity');

		expect(genderSelect()).toBeNull();
	});

	it('reads a type whose nature is not known yet as a profession', async () => {
		await open(null);

		expect([...genderSelect()!.options].map((o) => o.text)).toEqual(['Féminin', 'Masculin']);
	});
});
