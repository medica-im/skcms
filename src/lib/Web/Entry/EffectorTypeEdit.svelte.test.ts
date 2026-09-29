/**
 * The control that changes an entry's effector type, next to the type.
 *
 * Its three states come from the server's per-user permission: the edit pen
 * when allowed; the same pen barred when the organization's window has
 * passed (or the entry has no creation date), opening an explanation and
 * the way out -- recreate the entry with the same place and person; nothing
 * for someone with no right at all. 44px targets, and the barred pen says
 * what it means to a screen reader.
 */
import { describe, it, expect, vi } from 'vitest';
import '../../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

vi.mock('../../../entry.remote', () => ({
	changeEntryType: vi.fn(),
	previewEntryTypeChange: vi.fn(async () => ({ ok: true, removedTags: [] })),
	patchCommand: vi.fn()
}));
vi.mock('$app/paths', () => ({ base: '/annuaire' }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));
vi.mock('$lib/components/Directory/context', () => ({ getEntryUid: () => 'e1' }));
vi.mock('$lib/Web/EffectorTypeSelect.svelte', async () => ({
	default: (await import('./EffectorTypeSelectStub.svelte')).default
}));

import EffectorTypeEdit from './EffectorTypeEdit.svelte';

const props = (permission: unknown) => ({
	entryUid: 'e1',
	currentType: { uid: 't1', label: 'Infirmier' },
	facilityUid: 'f1',
	effectorUid: 'p1',
	active: true,
	permission: permission as never
});

const allowed = { allowed: true, reason: null, window_days: 30, deadline: null, created_at: 1 };
const expired = { allowed: false, reason: 'expired', window_days: 30, deadline: null, created_at: 1 };

describe('EffectorTypeEdit', () => {
	it('offers the edit pen when the change is allowed', async () => {
		render(EffectorTypeEdit, props(allowed));

		const pen = page.getByRole('button', { name: 'Modifier la catégorie' });
		await expect.element(pen).toBeVisible();
		expect(pen.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
	});

	it('keeps Save disabled until another type is chosen', async () => {
		render(EffectorTypeEdit, props(allowed));
		await page.getByRole('button', { name: 'Modifier la catégorie' }).click();

		await expect.element(page.getByTestId('entry-type-save')).toBeDisabled();
		await page.getByTestId('stub-pick-current').click();
		await expect.element(page.getByTestId('entry-type-save')).toBeDisabled();
		await page.getByTestId('stub-pick-other').click();
		await expect.element(page.getByTestId('entry-type-save')).toBeEnabled();
	});

	it('bars the pen once the window has passed, and says so to a screen reader', async () => {
		render(EffectorTypeEdit, props(expired));

		const barred = page.getByRole('button', { name: 'La catégorie ne peut plus être modifiée' });
		await expect.element(barred).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Modifier la catégorie' })).not.toBeInTheDocument();
	});

	it('explains why, and leads to recreating the entry with the same place and person', async () => {
		render(EffectorTypeEdit, props(expired));
		await page.getByRole('button', { name: 'La catégorie ne peut plus être modifiée' }).click();

		await expect.element(page.getByTestId('entry-type-locked-reason')).toHaveTextContent('plus de 30 jours');
		await expect
			.element(page.getByTestId('entry-type-recreate'))
			.toHaveAttribute('href', '/annuaire/web/entry?facility=f1&effector=p1');
		await expect.element(page.getByTestId('entry-type-save')).not.toBeInTheDocument();
	});

	it('says when the creation date is unknown', async () => {
		render(EffectorTypeEdit, props({ ...expired, reason: 'no_date' }));
		await page.getByRole('button', { name: 'La catégorie ne peut plus être modifiée' }).click();

		await expect.element(page.getByTestId('entry-type-locked-reason')).toHaveTextContent('date de création');
	});

	it.each([
		['no right at all', { ...expired, reason: 'not_allowed', window_days: null }],
		['no permission loaded', null]
	])('shows nothing for %s', async (_why, permission) => {
		render(EffectorTypeEdit, props(permission));

		await expect.element(page.getByTestId('entry-type-edit')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('entry-type-edit-locked')).not.toBeInTheDocument();
	});
});
