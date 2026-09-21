import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The features that need the machine to themselves get it in every browser.
 *
 * `PIXEL_SENSITIVE` names the features that measure or drag real layout boxes.
 * cropperjs positions its selection from getBoundingClientRect and moves it by
 * pointer events, so under contention a renderer that loses the race reports a
 * box that is briefly wrong or a drag that never lands — a failure that reads
 * as a product bug and is not. `chromium-serial` exists for exactly that, with
 * `fullyParallel: false` and one worker.
 *
 * The protection was applied per PROJECT rather than per FEATURE, and the
 * cropper runs in two: `chromium-serial` and `firefox-cropper`. The Firefox
 * one inherited none of it and ran fully parallel alongside the whole suite,
 * so avatar-crop-preview kept failing there on a 60s timeout waiting for a
 * button — the same scenario that is deliberately serialised in Chromium.
 *
 * So the rule is about the feature, not the browser: any project whose
 * testMatch is a pixel-sensitive feature runs serially, whichever engine it
 * drives.
 */

const config = readFileSync(new URL('../../playwright.config.ts', import.meta.url), 'utf8');

/** The body of one `{ … }` project literal, found by its name. */
function project(name: string): string {
	const at = config.indexOf(`name: '${name}'`);
	if (at === -1) throw new Error(`no project named ${name} in playwright.config.ts`);
	// Back up to the opening brace, then walk forward to its match.
	let start = config.lastIndexOf('{', at);
	let depth = 0;
	for (let i = start; i < config.length; i++) {
		if (config[i] === '{') depth++;
		else if (config[i] === '}') {
			depth--;
			if (depth === 0) return config.slice(start, i + 1);
		}
	}
	throw new Error(`unbalanced braces around project ${name}`);
}

describe('projects running a pixel-sensitive feature', () => {
	it('serialises the chromium one, as it always has', () => {
		// The baseline this rule comes from — kept so the fix below cannot be
		// "achieved" by loosening the project that was already right.
		const body = project('chromium-serial');

		expect(body).toMatch(/fullyParallel:\s*false/);
		expect(body).toMatch(/workers:\s*1/);
	});

	it('serialises the firefox cropper too', () => {
		// What was missing. Same feature, same third-party web component, same
		// sensitivity to a starved renderer — a different engine does not make
		// it safe to run against eight parallel workers.
		const body = project('firefox-cropper');

		expect(body).toMatch(/fullyParallel:\s*false/);
		expect(body).toMatch(/workers:\s*1/);
	});

	it('keeps the firefox project scoped to the cropper feature', () => {
		// Serialising is only affordable because this project is one feature.
		// If its testMatch ever widened, `workers: 1` would turn a ~1 minute
		// project into a serial second pass over the whole suite.
		expect(project('firefox-cropper')).toMatch(/avatar-crop-preview/);
	});
});
