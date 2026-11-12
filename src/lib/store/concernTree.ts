import { normalize } from './directoryStore.ts';
import type { Entry } from './directoryStoreInterface.ts';

/**
 * The conditions and situations a directory offers (GET /api/v2/concerns), each with
 * the uids of the entries picking it selects: its own and its descendants', never its
 * ancestors'. The tree, the search and the intersection are done here.
 */
export interface Concern {
	uid: string;
	slug: string | null;
	name: string;
	kind: 'chapter' | 'condition' | 'situation';
	/** The uid of the node above it, if any. */
	parent: string | null;
	/** Other names the search matches; never shown as the name. */
	synonyms: string[];
	entries: string[];
	/** The uids of offered situations it can lead to. */
	see_also: string[];
}

export interface ConcernNode extends Concern {
	children: ConcernNode[];
}

const byName = (a: Concern, b: Concern) => a.name.localeCompare(b.name);

/** The tree: nodes with no offered parent at the top, each level by name. */
export const buildTree = (concerns: Concern[]): ConcernNode[] => {
	const nodes = new Map(concerns.map((concern) => [concern.uid, { ...concern, children: [] as ConcernNode[] }]));
	const top: ConcernNode[] = [];
	for (const node of nodes.values()) {
		const parent = node.parent === null ? undefined : nodes.get(node.parent);
		(parent ? parent.children : top).push(node);
	}
	const sort = (level: ConcernNode[]) => {
		level.sort(byName);
		level.forEach((node) => sort(node.children));
	};
	sort(top);
	return top;
};

/** The nodes whose name or a synonym contains the term, ignoring accents and case. */
export const searchConcerns = (concerns: Concern[], term: string): Concern[] => {
	const wanted = normalize(term.trim());
	if (!wanted) {
		return [];
	}
	return concerns
		.filter((concern) => [concern.name, ...concern.synonyms].some((name) => normalize(name).includes(wanted)))
		.sort(byName);
};

/** The entries the picked node selects; every entry when nothing is picked. */
export const filterByConcern = (entries: Entry[], concerns: Concern[], picked: string | null): Entry[] => {
	if (picked === null) {
		return entries;
	}
	const selected = new Set(concerns.find((concern) => concern.uid === picked)?.entries);
	return entries.filter((entry) => selected.has(entry.uid));
};

/** "Voir aussi": the offered situations the picked node can lead to, with the listed entries that manage them. */
export const seeAlsoOf = (entries: Entry[], concerns: Concern[], picked: string | null) => {
	const leadsTo = new Set(concerns.find((concern) => concern.uid === picked)?.see_also);
	return concerns
		.filter((concern) => leadsTo.has(concern.uid))
		.map((concern) => ({ concern, entries: filterByConcern(entries, concerns, concern.uid) }))
		.filter((item) => item.entries.length)
		.sort((a, b) => byName(a.concern, b.concern));
};
