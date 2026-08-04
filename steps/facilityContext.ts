import { expect } from '@playwright/test';

/**
 * The facility a scenario is working on.
 *
 * Shared rather than kept per step file: playwright-bdd forbids defining the
 * same step twice, so steps like "I open the facility page for that facility"
 * are written once and reused across features. They can only agree on which
 * facility "that" means if they read it from the same place.
 */
export const facilityCtx: {
	uid?: string;
	slug?: string;
	/** Last API response a scenario provoked, for the steps that assert on it. */
	status?: number;
	body?: any;
} = {};

/**
 * Turns edit mode on, since the controls that change a facility only exist once
 * it is. Any step that clicks "Modifier l'établissement" or the picture button
 * has to come through here first.
 *
 * Guarded rather than unconditional: pressing the pencil while edit mode is
 * already on would turn it back off. A page with no pencil — a visitor who may
 * not edit — is left alone, so callers still fail on the control they were
 * really looking for rather than on this.
 */
export async function enterEditMode(page: import('@playwright/test').Page) {
	const pencil = page.getByRole('switch').first();

	// The pencil only appears once the page has asked the server whether this
	// visitor may edit, so give it time to arrive. count() answers immediately
	// and would read a pencil that is merely still loading as one that is not
	// coming, leaving the caller to fail on a control this function was meant
	// to reveal.
	try {
		await pencil.waitFor({ state: 'visible', timeout: 15_000 });
	} catch {
		// Genuinely absent: a visitor who may not edit. Leave the page alone so
		// the caller fails on what it was really looking for.
		return;
	}

	if ((await pencil.getAttribute('aria-checked')) !== 'true') {
		await pencil.click();
		await expect(pencil).toHaveAttribute('aria-checked', 'true');
	}
}

/** Forgets the current facility; call from an After hook. */
export function resetFacilityCtx() {
	facilityCtx.uid = undefined;
	facilityCtx.slug = undefined;
	facilityCtx.status = undefined;
	facilityCtx.body = undefined;
}
