import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Every editing widget confirms a save the same way.
 *
 * The entry page at /e/[slug] is a page of small independent widgets — phone,
 * email, address, access, ownership, each saving on its own. A reader who
 * changes one of them has no page reload to tell them it worked, so the widget
 * has to say so itself, and every widget has to say it the same way or the page
 * teaches a different vocabulary in each corner.
 *
 * The established answer, already in 55 components, is Skeleton's filled
 * success badge with a check:
 *
 *     {#if result?.success}
 *         <span class="badge-icon variant-filled-success"><Fa icon={faCheck} /></span>
 *     {/if}
 *
 * This test holds the rest to it. It reads source rather than rendering,
 * because what is being checked is a convention across a directory — a
 * component test per widget would be 60 files and would still miss the next one
 * somebody adds.
 *
 * Failure feedback is deliberately not checked here: several widgets render
 * `{#if result && !result.success}` and nothing for the success case, which is
 * precisely the asymmetry this exists to catch — an error is loud, a save is
 * silent, and the reader is left guessing which happened.
 */

const WEB = resolve(__dirname, '.');

/** Every .svelte component under src/lib/Web, recursively. */
function components(dir = WEB): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return components(path);
		return name.endsWith('.svelte') ? [path] : [];
	});
}

const read = (path: string) => readFileSync(path, 'utf8');
const name = (path: string) => relative(WEB, path);

/**
 * Widgets that report the outcome of a write.
 *
 * Keyed on the widget holding a `result` — the thing it would use to tell the
 * reader what happened — rather than on how it submits. Detecting the submit
 * was the first attempt and it was unreliable in both directions:
 *
 *   - it matched `from '...remote'` on any import, so CreatorOwner.svelte
 *     counted. That one is subtler than it first looked: the component does
 *     reach a write, rendering PatchOwnerModal in edit mode, which patches the
 *     entry's owner. But the confirmation belongs in the modal — where the
 *     write happens and the result lives — not in the list around it, whose own
 *     checkmarks mean "this user is the owner" and are a data state rather than
 *     an outcome. Following the result puts the rule in the right place;
 *     following the import put it on the wrapper;
 *   - tightening that to a call (`patchCommand(`, `use:enhance`) then missed
 *     every widget using a remote *form* — `updateForm` submitted via
 *     `await submit()` names no pattern above. That hid 24 of 50 components,
 *     websites, phones, emails, social media and the association panels among
 *     them. They all happened to carry the badge, so the suite was green on
 *     luck rather than on coverage, which is worse than being red.
 *
 * A widget that writes something needs somewhere to put the outcome, and in
 * this codebase that is a `FormResult`. So that is what is counted: it does not
 * care how the write is dispatched, and a new mechanism inherits the rule
 * instead of escaping it.
 */
function reportsOutcome(source: string): boolean {
	return /FormResult|result\s*=\s*\$state|result\??\.success/.test(source);
}

/** The agreed success affordance. */
const SUCCESS_BADGE = 'badge-icon variant-filled-success';

/**
 * Widgets exempt from the badge, each for a stated reason.
 *
 * An exemption is a decision, so it is written down with its argument rather
 * than left as a silently passing file. Anything not here needs the badge.
 */
const EXEMPT: Record<string, string> = {
	'Email/BatchEmail.svelte':
		'Sends to many recipients and reports a per-recipient result table; a ' +
		'single badge would claim success for a batch that partly failed.',
	'EntryCreationForm.svelte':
		'Navigates to the created entry on success, so the confirmation is the ' +
		'new page rather than a badge on a form the reader has left.'
};

describe('saving something says so', () => {
	const saving = components().filter((path) => reportsOutcome(read(path)));

	it('finds the widgets that save, so this test cannot quietly cover nothing', () => {
		// A guard on the detector above: if it stops matching — a rename, a new
		// way of holding the outcome — every assertion below would pass over an
		// empty list and report green. The floor is set near the real count (55
		// at the time of writing) rather than at some token number, so losing
		// half of them fails here instead of passing quietly, which is exactly
		// what the previous detector did.
		expect(saving.length).toBeGreaterThan(45);
	});

	it('shows the same success badge in every one', () => {
		const missing = saving
			.map(name)
			.filter((file) => !(file in EXEMPT))
			.filter((file) => !read(join(WEB, file)).includes(SUCCESS_BADGE));

		expect(
			missing,
			`these widgets save but never confirm it:\n  ${missing.join('\n  ')}\n\n` +
				`Add the affordance the other widgets use:\n` +
				`  {#if result?.success}\n` +
				`      <span class="${SUCCESS_BADGE}"><Fa icon={faCheck} /></span>\n` +
				`  {/if}\n\n` +
				`If a widget genuinely should not have one, add it to EXEMPT with the reason.`
		).toEqual([]);
	});

	it('does not report an error louder than a success', () => {
		// The asymmetry that prompted this: a widget rendering
		// `{#if result && !result.success}` and nothing for the other branch
		// tells the reader when it failed and leaves them guessing when it
		// worked.
		const asymmetric = saving
			.map(name)
			.filter((file) => !(file in EXEMPT))
			.filter((file) => {
				const source = read(join(WEB, file));
				return /!result\??\.success/.test(source) && !source.includes(SUCCESS_BADGE);
			});

		expect(asymmetric, `these widgets report failure but not success:\n  ${asymmetric.join('\n  ')}`)
			.toEqual([]);
	});

	it('keeps every exemption pointing at a widget that still exists', () => {
		// An exemption outliving its file is a rule nobody is subject to, and
		// reads like coverage.
		const present = new Set(components().map(name));
		const stale = Object.keys(EXEMPT).filter((file) => !present.has(file));
		expect(stale, `EXEMPT names files that are gone: ${stale.join(', ')}`).toEqual([]);
	});
});
