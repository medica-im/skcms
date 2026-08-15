import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Role labels have one home.
 *
 * `superuser`, `administrator`, `staff`, `registered` and `anonymous` are
 * identifiers the backend authorises against; what they are *called* is a view
 * concern, and belongs to the message catalogues on this side. The rules below
 * exist because that was not true for a while and the copies drifted.
 *
 * The same three maps — label, short label, badge variant — had been pasted
 * into eight components. Nothing made them agree, so they slowly stopped
 * agreeing: the backend's own `access_role.label` column, a ninth copy, still
 * says "Équipe" and "Administration" where the UI says "Équipier" and
 * "Administrateur". That column is never serialised, so the divergence is
 * invisible until somebody reads both.
 *
 * These tests pin three things:
 *
 * 1. every role has a long *and* a short label, in every language,
 * 2. short labels are actually short — the point of them is fitting in a
 *    `badge-sm`, and "Utilisateur enregistré" in a badge is what started this,
 * 3. components import the shared maps instead of declaring their own.
 */

const MESSAGES = new URL('../../messages/', import.meta.url).pathname;
// The whole source tree, not just src/lib: four of the copies this rule exists
// to prevent were route components, and a check that only walked src/lib would
// have reported them clean.
const SRC = new URL('../', import.meta.url).pathname;

const load = (lang: string) =>
	JSON.parse(readFileSync(join(MESSAGES, `${lang}.json`), 'utf8')) as Record<string, any>;

const LANGS = ['fr', 'en'];

// Every role the frontend knows about, from src/lib/interfaces/v2/invitee.ts.
// Listed rather than imported so that adding a role to the union without
// adding its labels fails here, which is the whole point.
const ROLES = ['SUPERUSER', 'ADMINISTRATOR', 'STAFF', 'REGISTERED', 'ANONYMOUS'];

// Long enough for a real word, short enough for a badge. "Équipier" is 8 and
// has to pass; "Utilisateur enregistré" is 22 and must not.
const MAX_SHORT_LABEL = 12;

describe('the message catalogues', () => {
	for (const lang of LANGS) {
		const msgs = load(lang);

		it(`${lang}: every role has a label and a short label`, () => {
			const role = msgs.ROLE ?? {};
			for (const r of ROLES) {
				expect(role[r], `ROLE.${r} missing from ${lang}.json`).toBeTruthy();
				expect(role[`${r}_SHORT`], `ROLE.${r}_SHORT missing from ${lang}.json`).toBeTruthy();
			}
		});

		it(`${lang}: short labels fit in a badge`, () => {
			const role = msgs.ROLE ?? {};
			for (const r of ROLES) {
				const short = role[`${r}_SHORT`] as string;
				expect(
					short.length,
					`ROLE.${r}_SHORT is "${short}" (${short.length} chars) — too long for a badge`
				).toBeLessThanOrEqual(MAX_SHORT_LABEL);
			}
		});

		it(`${lang}: a short label is never longer than its full label`, () => {
			const role = msgs.ROLE ?? {};
			for (const r of ROLES) {
				const long = role[r] as string;
				const short = role[`${r}_SHORT`] as string;
				expect(
					short.length,
					`ROLE.${r}_SHORT ("${short}") is longer than ROLE.${r} ("${long}")`
				).toBeLessThanOrEqual(long.length);
			}
		});
	}
});

/**
 * Walk the source tree, skipping what is not ours to police.
 */
function sourceFiles(dir: string, acc: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (name === 'node_modules' || name === '.svelte-kit' || name.startsWith('paraglide')) {
			continue;
		}
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			sourceFiles(path, acc);
		} else if (/\.(svelte|ts)$/.test(name)) {
			acc.push(path);
		}
	}
	return acc;
}

describe('components use the shared maps', () => {
	// A component calling m['ROLE.STAFF']() directly is building its own copy
	// of a map that already exists. src/lib/roles.ts is the exception: it is
	// the copy.
	const OWNER = 'roles.ts';

	it('no component declares its own role label map', () => {
		const offenders: string[] = [];
		for (const path of sourceFiles(SRC)) {
			if (path.endsWith(OWNER) || path.endsWith('roles.test.ts')) continue;
			const text = readFileSync(path, 'utf8');
			if (/m\['ROLE\.(SUPERUSER|ADMINISTRATOR|STAFF|REGISTERED|ANONYMOUS)'\]\(\)/.test(text)) {
				offenders.push(path.replace(SRC, 'src/'));
			}
		}
		expect(
			offenders,
			`these files build their own role labels; import { roleLabels } from '$lib/roles' instead:\n  ${offenders.join('\n  ')}`
		).toEqual([]);
	});

	it('no component declares its own role variant map', () => {
		const offenders: string[] = [];
		for (const path of sourceFiles(SRC)) {
			if (path.endsWith(OWNER) || path.endsWith('roles.test.ts')) continue;
			const text = readFileSync(path, 'utf8');
			// The tell is the map literal, not a use of the imported name.
			if (/const roleVariants\s*:/.test(text)) {
				offenders.push(path.replace(SRC, 'src/'));
			}
		}
		expect(
			offenders,
			`these files build their own badge variants; import { roleVariants } from '$lib/roles' instead:\n  ${offenders.join('\n  ')}`
		).toEqual([]);
	});
});
