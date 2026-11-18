/**
 * What the payer and payment forms send, and that the remote command's schema takes it.
 *
 * An entry's payment methods and third-party payers are stored as nothing, never `[]`:
 * the backend turns an empty list into no property, and the page reads the same either
 * way. The forms send a list of names, or `null` when everything is unticked (svelte-select
 * empties its value to null) and from « delete »; `[]` from any other caller, so the schema
 * has to take all three.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as z from 'zod';
import ThirdPartyPayerPatch from './Patch.svelte';
import ThirdPartyPayerDelete from './Delete.svelte';
import PaymentPatch from '../Payment/Patch.svelte';
import PaymentDelete from '../Payment/Delete.svelte';
import '../../../../app.postcss';

document.body.dataset.theme = 'wintry';

const remote = vi.hoisted(() => ({
	patchCommand: vi.fn(),
	getThirdPartyPayers: vi.fn(),
	getPaymentMethods: vi.fn()
}));
vi.mock('../../../../entry.remote', () => remote);
vi.mock('$app/navigation', () => ({ invalidate: vi.fn() }));
vi.mock('#lib/components/Directory/context', () => ({ getEntryUid: () => 'entry-uid' }));

/** The schema of `patchCommand` in entry.remote.ts, for the two fields under test. */
const schema = z.object({
	payment: z.nullable(z.array(z.string())).optional(),
	third_party_payer: z.nullable(z.array(z.string())).optional()
});

const payers = [
	{ name: 'CPAM', label_fr: 'Assurance maladie' },
	{ name: 'MUTUELLE', label_fr: 'Mutuelle' }
];
const methods = [
	{ name: 'CB', label_fr: 'Carte bancaire' },
	{ name: 'ESPECES', label_fr: 'Espèces' }
];

beforeEach(() => {
	remote.patchCommand.mockReset();
	remote.patchCommand.mockResolvedValue({ success: true, status: 200, text: 'OK' });
	remote.getThirdPartyPayers.mockResolvedValue(payers);
	remote.getPaymentMethods.mockResolvedValue(methods);
});

const sent = () => remote.patchCommand.mock.calls[0][0];

describe('the schema of the entry patch', () => {
	it.each([undefined, null, [], ['CPAM']])('takes %j for both lists', (value) => {
		expect(schema.safeParse({ payment: value, third_party_payer: value }).success).toBe(true);
	});
});

describe.each([
	{
		form: 'third-party payers',
		Patch: ThirdPartyPayerPatch,
		Delete: ThirdPartyPayerDelete,
		field: 'third_party_payer',
		data: [payers[0]]
	},
	{
		form: 'payment methods',
		Patch: PaymentPatch,
		Delete: PaymentDelete,
		field: 'payment',
		data: [methods[0]]
	}
])('the $form form', ({ Patch, Delete, field, data }) => {
	it('sends null when the entry loses them all', async () => {
		render(Delete, { props: { data } });
		await screen.getByRole('button', { name: 'Supprimer' }).first().click();
		await screen.getByRole('button', { name: 'Supprimer' }).last().click();
		expect(sent()).toEqual({ entry: 'entry-uid', [field]: null });
		expect(schema.safeParse(sent()).success).toBe(true);
	});

	it('sends null once everything is unticked', async () => {
		render(Patch, { props: { data } });
		await screen.getByRole('button', { name: 'Modifier' }).click();
		await expect.poll(() => document.querySelector('.multi-item-clear')).not.toBeNull();
		// svelte-select removes a chip on pointerup, not click.
		document
			.querySelector('.multi-item-clear')!
			.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
		await screen.getByRole('button', { name: 'Envoyer' }).click();
		expect(sent()).toEqual({ entry: 'entry-uid', [field]: null });
		expect(schema.safeParse(sent()).success).toBe(true);
	});
});
