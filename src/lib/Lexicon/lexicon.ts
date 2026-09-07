import dict from '$lib/components/TooltipDefinition/lexicon.js';
import type { LexiconEntry } from './scan';

/**
 * The lexicon as the scanner wants it: one entry per concept, carrying every
 * spelling of it.
 *
 * lexicon.js stores a synonym as a key whose definition is another key —
 * `ESP: ['Équipe de soins primaires']` — which is what Def.svelte resolves at
 * render time. That shape is convenient for a popup looking up one word and
 * useless for a scan, which needs to know that two spellings are one concept
 * so a page is not asked to define the same thing twice.
 *
 * Written as a translation rather than a change to lexicon.js: that file is
 * shared by every site and read by the lexique page and Def, and this step is
 * where the database-backed lexicon will eventually plug in instead.
 */
export const lexiconEntries = (source: Record<string, string[]> = dict): LexiconEntry[] => {
	const entries = new Map<string, Set<string>>();

	for (const [key, value] of Object.entries(source)) {
		// A synonym points at the key that holds the real definition. The
		// canonical term is that target, so both spellings land on one entry.
		const target = value[0];
		const term = typeof target === 'string' && target in source ? target : key;
		if (!entries.has(term)) entries.set(term, new Set([term]));
		entries.get(term)!.add(key);
	}

	return [...entries].map(([term, labels]) => ({
		term,
		// Longest first, so "Équipe de soins primaires" is matched as itself
		// rather than reported twice over one of its own words.
		labels: [...labels].sort((a, b) => b.length - a.length)
	}));
};
