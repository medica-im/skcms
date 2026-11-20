/**
 * Opening the edit and delete modals for effector types.
 *
 * Both the list of types (/web/effector-types) and the detail page
 * (/web/effector-types/[uid]) offer edit and delete actions that open
 * shallow-routed dialogs. The URLs must resolve through the app's base path
 * and goto must be awaited so that the dialog opens reliably without racing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import * as m from '$msgs';
import type { EffectorType } from '#lib/interfaces/v2/effector.ts';
import { goto } from '$app/navigation';
import { testPageState } from './testState.svelte.ts';

vi.mock('$src/effectorType.remote.ts', async () => {
	const { fakeRemoteForm } = await import('../test-fake-form.ts');
	const form = fakeRemoteForm();
	return {
		createEffectorType: { for: () => form },
		updateEffectorType: { for: () => form },
		deleteEffectorType: { for: () => form },
		disconnectEffectorTypeParent: vi.fn()
	};
});

vi.mock('$app/paths', () => ({
	resolve: (path: string) => `/annuaire/${path}`,
	base: () => '/annuaire'
}));

vi.mock('$app/state', () => ({
	get page() {
		return {
			get state() {
				return testPageState.state;
			},
			url: new URL('http://localhost/annuaire/web/effector-types'),
			data: {}
		};
	}
}));

const pathOf = (href: string) => (href.startsWith('http') ? new URL(href).pathname : href);

vi.mock('$app/navigation', () => ({
	preloadData: vi.fn(async (href: string) => {
		if (!pathOf(href).startsWith('/annuaire/')) {
			throw new Error(`Attempted to preload a URL that does not belong to this app: ${href}`);
		}
		return {
			type: 'loaded' as const,
			status: 200,
			data: { effectorTypes: [] }
		};
	}),
	goto: vi.fn(async (href: string, opts?: { shallow?: boolean; state?: Record<string, unknown> }) => {
		if (!pathOf(href).startsWith('/annuaire/')) {
			throw new Error(`Attempted to navigate to a URL that does not belong to this app: ${href}`);
		}
		if (opts?.state) {
			await new Promise((r) => setTimeout(r, 10));
			testPageState.setState(opts.state);
		}
	})
}));

import EffectorTypesListPage from '$routes/(common)/web/effector-types/+page.svelte';
import EffectorTypeDetailPage from '$routes/(common)/web/effector-types/[uid]/+page.svelte';

const testEffectorType: EffectorType = {
	uid: 'et-general-practitioner',
	name_fr: 'Médecin généraliste',
	label_fr: 'Médecin généraliste',
	slug_fr: 'medecin-generaliste',
	isHCW: true,
	isRPPS: true,
	synonyms_fr: ['Docteur', 'Généraliste']
};

beforeEach(() => {
	testPageState.reset();
});

describe('EffectorTypeModals', () => {
	describe('in the list of types (/web/effector-types)', () => {
		it('clicking edit opens the edit modal', async () => {
			render(EffectorTypesListPage, {
				props: {
					data: { effectorTypes: [testEffectorType] } as never
				}
			});

			const row = page.getByRole('link', { name: 'Médecin généraliste' }).first();
			await expect.element(row).toBeVisible();

			// Click the edit button on the row
			const editBtn = document.querySelector('button.variant-ghost-secondary') as HTMLButtonElement;
			expect(editBtn).not.toBeNull();
			editBtn.click();

			// The edit modal must open with its title
			const modalTitle = page.getByRole('heading', { name: m.EFFECTOR_TYPE_EDIT() });
			await expect.element(modalTitle).toBeVisible();
		});

		it('clicking delete opens the delete modal', async () => {
			render(EffectorTypesListPage, {
				props: {
					data: { effectorTypes: [testEffectorType] } as never
				}
			});

			const row = page.getByRole('link', { name: 'Médecin généraliste' }).first();
			await expect.element(row).toBeVisible();

			// Click the delete button on the row
			const deleteBtn = document.querySelector('button.variant-ghost-error') as HTMLButtonElement;
			expect(deleteBtn).not.toBeNull();
			deleteBtn.click();

			// The delete modal must open with its title
			const modalTitle = page.getByRole('heading', { name: m.EFFECTOR_TYPE_DELETE() });
			await expect.element(modalTitle).toBeVisible();
		});
	});

	describe('creating a type from the list of types', () => {
		const openList = () =>
			render(EffectorTypesListPage, {
				props: {
					data: { effectorTypes: [testEffectorType] } as never
				}
			});
		const createTitle = () => page.getByRole('heading', { name: m.EFFECTOR_TYPE_CREATE() });

		it('opens the create modal once the shallow navigation has settled', async () => {
			openList();

			await page.getByRole('button', { name: m.CREATE() }).click();

			await expect.element(createTitle()).toBeVisible();
			expect(goto).toHaveBeenCalledWith(
				expect.stringMatching(/\/annuaire\/web\/effector-types\/create$/),
				expect.objectContaining({ shallow: true })
			);
		});

		it('closes the create modal and steps back in history on Cancel', async () => {
			const back = vi.spyOn(history, 'back').mockImplementation(() => {});
			openList();
			await page.getByRole('button', { name: m.CREATE() }).click();
			await expect.element(createTitle()).toBeVisible();

			await page.getByRole('button', { name: m.CANCEL() }).click();

			expect(back).toHaveBeenCalledOnce();
			await expect.element(createTitle()).not.toBeInTheDocument();
			back.mockRestore();
		});
	});

	describe('on the detail page (/web/effector-types/[uid])', () => {
		it('clicking edit opens the edit modal', async () => {
			render(EffectorTypeDetailPage, {
				props: {
					data: { effectorType: testEffectorType, effectorTypes: [testEffectorType] } as never
				}
			});

			const editBtn = page.getByRole('button', { name: m.EDIT() });
			await expect.element(editBtn).toBeVisible();
			await editBtn.click();

			// The edit modal must open with its title
			const modalTitle = page.getByRole('heading', { name: m.EFFECTOR_TYPE_EDIT() });
			await expect.element(modalTitle).toBeVisible();
		});

		it('clicking delete opens the delete modal', async () => {
			render(EffectorTypeDetailPage, {
				props: {
					data: { effectorType: testEffectorType, effectorTypes: [testEffectorType] } as never
				}
			});

			const deleteBtn = page.getByRole('button', { name: m.DELETE() });
			await expect.element(deleteBtn).toBeVisible();
			await deleteBtn.click();

			// The delete modal must open with its title
			const modalTitle = page.getByRole('heading', { name: m.EFFECTOR_TYPE_DELETE() });
			await expect.element(modalTitle).toBeVisible();
		});
	});

	describe('cancelling a modal', () => {
		const openDetailPage = () =>
			render(EffectorTypeDetailPage, {
				props: {
					data: { effectorType: testEffectorType, effectorTypes: [testEffectorType] } as never
				}
			});

		it('leaves the edit modal for the list of types through the base path', async () => {
			openDetailPage();
			await page.getByRole('button', { name: m.EDIT() }).click();
			await expect.element(page.getByRole('heading', { name: m.EFFECTOR_TYPE_EDIT() })).toBeVisible();
			vi.mocked(goto).mockClear();

			await page.getByRole('button', { name: m.CANCEL() }).click();

			expect(goto).toHaveBeenCalledWith('/annuaire/web/effector-types');
		});

		it('leaves the delete modal for the list of types through the base path', async () => {
			openDetailPage();
			await page.getByRole('button', { name: m.DELETE() }).click();
			await expect.element(page.getByRole('heading', { name: m.EFFECTOR_TYPE_DELETE() })).toBeVisible();
			vi.mocked(goto).mockClear();

			await page.getByRole('button', { name: m.CANCEL() }).click();

			expect(goto).toHaveBeenCalledWith('/annuaire/web/effector-types');
		});
	});
});
