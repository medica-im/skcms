/**
 * The preview of an invitation email. It opens on an example invitee so the
 * email is already readable, and renders again by itself whenever the name or
 * the address is changed -- an administrator should never have to find a
 * refresh button to see the effect of what was typed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import TemplatePreview from './TemplatePreview.svelte';
import { previewEmailTemplate } from '../../../../emailTemplate.remote';

vi.mock('../../../../emailTemplate.remote', () => ({
	previewEmailTemplate: vi.fn()
}));

const draft = {
	subject: 'Invitation',
	body: '<p>{{ invitee_name }} {{ invitee_email }}</p>',
	body_text: '',
	content_type: 'html' as const
};

const example = { name: 'Camille Fontaine', email: 'camille.fontaine@example.org' };

const answer =(request: { invitee_name?: string; invitee_email?: string }) => ({
	success: true,
	status: 200,
	data: {
		subject: `Invitation ${request.invitee_email}`,
		text: `${request.invitee_name} ${request.invitee_email}`,
		html: `<p>${request.invitee_name} ${request.invitee_email}</p>`,
		problems: []
	}
});

const lastRequest = () => vi.mocked(previewEmailTemplate).mock.lastCall?.[0];
const name = () => page.getByRole('textbox', { name: "Nom de la personne invitée" });
const email = () => page.getByRole('textbox', { name: 'Adresse e-mail de la personne invitée' });

describe('TemplatePreview', () => {
	beforeEach(() => {
		vi.mocked(previewEmailTemplate).mockReset();
		vi.mocked(previewEmailTemplate).mockImplementation((async (request: any) => answer(request)) as any);
	});

	it('opens on an example name and address, already rendered', async () => {
		render(TemplatePreview, { draft, example });
		await expect.element(name()).toHaveValue('Camille Fontaine');
		await expect.element(email()).toHaveValue('camille.fontaine@example.org');
		await expect
			.poll(() => lastRequest())
			.toMatchObject({ invitee_name: 'Camille Fontaine', invitee_email: 'camille.fontaine@example.org' });
		await expect
			.element(page.getByTestId('preview-subject'))
			.toHaveTextContent('Invitation camille.fontaine@example.org');
	});

	it('renders again when the address is changed', async () => {
		render(TemplatePreview, { draft, example });
		await expect.poll(() => lastRequest()).toBeDefined();
		await email().fill('jean.dupont@example.fr');
		await expect.poll(() => lastRequest()?.invitee_email).toBe('jean.dupont@example.fr');
		await expect
			.element(page.getByTestId('preview-subject'))
			.toHaveTextContent('Invitation jean.dupont@example.fr');
	});

	it('follows the address while it is still being typed', async () => {
		render(TemplatePreview, { draft, example });
		await expect.poll(() => lastRequest()).toBeDefined();
		await email().fill('jean.dupont');
		await expect.poll(() => lastRequest()?.invitee_email).toBe('jean.dupont');
	});

	it('renders again when the name is changed', async () => {
		render(TemplatePreview, { draft, example });
		await expect.poll(() => lastRequest()).toBeDefined();
		await name().fill('Jean Dupont');
		await expect.poll(() => lastRequest()?.invitee_name).toBe('Jean Dupont');
	});

	it('falls back to the backend example when the address is emptied', async () => {
		render(TemplatePreview, { draft, example });
		await expect.poll(() => lastRequest()).toBeDefined();
		await email().fill('');
		await expect.poll(() => lastRequest()?.invitee_email).toBeUndefined();
	});
});
