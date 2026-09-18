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
 * Widgets that save something.
 *
 * Detected by how they submit rather than by filename: `Update*`/`Create*` is a
 * naming habit, not a rule, and a widget that saves under some other name still
 * owes its reader the same confirmation.
 *
 * A *call* to a remote function, not an import from `.remote` — importing
 * `getUser` from user.remote.ts is a read. Matching the module path counted
 * CreatorOwner.svelte, which only displays who owns an entry, and would have
 * had it grow a save confirmation for a save it never performs.
 */
function saves(source: string): boolean {
	return (
		/use:enhance/.test(source) ||
		/\b(?:patch|post|put|delete|create|update|save|submit)[A-Za-z]*Command\s*\(/i.test(source) ||
		/\b(?:command|form)\(/.test(source)
	);
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
	const saving = components().filter((path) => saves(read(path)));

	it('finds the widgets that save, so this test cannot quietly cover nothing', () => {
		// A guard on the detector above: if `saves()` stops matching — a new
		// submit mechanism, a rename — every assertion below would pass over an
		// empty list and report green.
		expect(saving.length).toBeGreaterThan(20);
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
