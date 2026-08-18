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

	await setSwitch(pencil, true);
}

/**
 * Press a `role="switch"` until it actually reads the state asked for.
 *
 * **Why clicking once is not enough.** Being visible is not the same as being
 * live. The pencil is server-rendered with its markup complete — role,
 * aria-checked, classes, the lot — but the handler that flips it is a Svelte
 * onclick attached at hydration (src/lib/Switch/Switch.svelte). Every one of
 * Playwright's actionability checks passes on the painted button, so a click
 * landing between paint and hydration is delivered to an element with no
 * listener: nothing happens, silently, and the assertion that follows spends
 * its whole timeout watching an aria-checked that was never going to change.
 *
 * Waiting longer *before* the click does not fix it — `toBeVisible` and
 * `toBeEnabled` are both already true — which is why the several step files
 * that tried that still flaked. Only re-clicking closes the gap: whichever
 * press lands after hydration is the one that works.
 *
 * The gap widens exactly when the machine is busy, so these failed in full
 * suite runs and passed when run alone.
 *
 * Re-reads the state after each failed attempt rather than clicking blindly:
 * a click that did register would have flipped the switch, and clicking again
 * on a working switch would turn it straight back off.
 */
export async function setSwitch(
	control: import('@playwright/test').Locator,
	on: boolean,
	timeout = 20_000
) {
	const wanted = on ? 'true' : 'false';
	if ((await control.getAttribute('aria-checked')) === wanted) return;

	const deadline = Date.now() + timeout;
	let lastError: unknown;
	while (Date.now() < deadline) {
		await control.click();
		try {
			await expect(control).toHaveAttribute('aria-checked', wanted, { timeout: 2_000 });
			return;
		} catch (e) {
			lastError = e;
			if ((await control.getAttribute('aria-checked')) === wanted) return;
		}
	}
	throw lastError ?? new Error(`the switch never turned ${on ? 'on' : 'off'}`);
}

/** Forgets the current facility; call from an After hook. */
export function resetFacilityCtx() {
	facilityCtx.uid = undefined;
	facilityCtx.slug = undefined;
	facilityCtx.status = undefined;
	facilityCtx.body = undefined;
}
