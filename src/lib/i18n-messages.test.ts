import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The message catalogues, checked against each other.
 *
 * These catch the mistakes that are invisible on screen: a key added to one
 * language and forgotten in the other renders as the key name or as the wrong
 * language, and neither looks like an error to whoever added it.
 *
 * What they cannot catch is text that never reaches a catalogue at all — a
 * hardcoded string in a component, or a library default like svelte-select's
 * "Please select". Those need the source-level check in
 * src/lib/Web/select-wrapper.test.ts and the rendered check in
 * tests/select-i18n.spec.ts.
 */

// Lives under src/ so vitest's `unit` project picks it up (its include is
// src/**), while the catalogues it reads sit at the repo root in messages/.
const DIR = new URL('../../messages/', import.meta.url).pathname;
const load = (lang: string) =>
	JSON.parse(readFileSync(join(DIR, `${lang}.json`), 'utf8')) as Record<string, unknown>;

const fr = load('fr');
const en = load('en');
const keys = (o: Record<string, unknown>) =>
	Object.keys(o).filter((k) => !k.startsWith('$'));

/**
 * Words spelled the same in both languages. A translation identical to the
 * English is usually a forgotten one, but not always, and listing the genuine
 * cases is what lets the check stay strict about the rest.
 */
const SAME_IN_BOTH = new Set([
	// Words French and English spell the same way.
	'ADDRESSBOOK_INFORMATIONS',
	'ASSOCIATION_TITLE',
	'CANCER',
	'COL_ACTIONS',
	'CONTACT_TITLE',
	'EFFECTOR_TYPE_COL_ACTIONS',
	'EFFECTOR_TYPE_COL_LABELS',
	'EFFECTOR_TYPE_COL_PARENT',
	'EFFECTOR_TYPE_CONCEPT',
	'INACTIVE',
	'INVITEE_COL_ACTIONS',
	'INVITEE_COL_EMAIL',
	'INVITEE_PAGE_TITLE',
	'OFFICERS_SHORT',
	'SITES_PLURAL',
	'SITES_SINGULAR',
	'SITES_TITLE',
	'VACANT',
	// Plural forms whose two variants happen to match in both languages.
	'SITE_COUNT',
	'invitation',
	'invitee_noun',
	// Genuinely untranslated, but nothing renders it — no component calls
	// m.PASSWORD(). Translate it rather than removing it from here if it ever
	// gains a caller.
	'PASSWORD'
]);

describe('message catalogues', () => {
	it('define the same keys in every language', () => {
		const missingFromFr = keys(en).filter((k) => !(k in fr));
		const missingFromEn = keys(fr).filter((k) => !(k in en));
		expect(missingFromFr, `keys in en.json with no French translation`).toEqual([]);
		expect(missingFromEn, `keys in fr.json with no English text`).toEqual([]);
	});

	it('leave no message empty', () => {
		const empty = keys(fr).filter((k) => typeof fr[k] === 'string' && !(fr[k] as string).trim());
		expect(empty, 'French messages with no text').toEqual([]);
	});

	it('use the same placeholders on both sides', () => {
		// A translation that drops {count} or renames it to {nombre} throws at
		// runtime, or silently renders nothing, depending on the message.
		const holders = (s: unknown) =>
			typeof s === 'string' ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : [];
		const mismatched = keys(fr)
			.filter((k) => k in en)
			.filter((k) => holders(fr[k]).join() !== holders(en[k]).join())
			.map((k) => `${k}: fr{${holders(fr[k])}} vs en{${holders(en[k])}}`);
		expect(mismatched, 'messages whose placeholders differ between languages').toEqual([]);
	});

	it('do not leave French identical to the English', () => {
		const untranslated = keys(fr)
			.filter((k) => k in en && !SAME_IN_BOTH.has(k))
			.filter((k) => typeof fr[k] === 'string' && fr[k] === en[k]);
		expect(
			untranslated,
			`French text identical to the English. If the word really is the same in ` +
				`both languages, add the key to SAME_IN_BOTH above; otherwise it is an ` +
				`untranslated message`
		).toEqual([]);
	});
});
