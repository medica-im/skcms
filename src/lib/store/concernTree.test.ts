/**
 * The condition/situation selector.
 *
 * The backend sends each offered node with the uids of the entries picking it
 * selects (its own and its descendants', never its ancestors') and the nodes a
 * "voir aussi" points to. The browser builds the tree, searches names and
 * synonyms without regard to accents or case, and intersects.
 */
import { describe, it, expect } from 'vitest';
import { buildTree, searchConcerns, filterByConcern, seeAlsoOf, type Concern } from './concernTree.ts';
import { makeEntry } from './directoryStore.fixtures.ts';

const concern = (uid: string, patch: Partial<Concern> = {}): Concern => ({
	uid,
	slug: uid,
	name: uid,
	kind: 'condition',
	parent: null,
	synonyms: [],
	entries: [],
	see_also: [],
	...patch
});

const CONCERNS: Concern[] = [
	concern('addictions', { name: 'Addictions', kind: 'chapter', synonyms: ['dépendance', 'toxicomanie'], entries: ['e1', 'e2'] }),
	concern('alcool', { name: 'Alcool', parent: 'addictions', entries: ['e1'] }),
	concern('cannabis', { name: 'Cannabis', parent: 'addictions', entries: ['e2'] }),
	concern('depression', { name: 'Dépression', kind: 'chapter', entries: ['e3'], see_also: ['crise'] }),
	concern('crise', { name: 'Crise suicidaire', kind: 'situation', entries: ['e4'] })
];

describe('the tree', () => {
	it('has the chapters and situations at the top and the conditions under their parent, each level by name', () => {
		const tree = buildTree(CONCERNS);
		expect(tree.map((node) => node.uid)).toEqual(['addictions', 'crise', 'depression']);
		expect(tree[0].children.map((node) => node.uid)).toEqual(['alcool', 'cannabis']);
		expect(tree[1].children).toEqual([]);
	});

	it('puts a node whose parent is not offered at the top', () => {
		const tree = buildTree([concern('orphan', { parent: 'gone' })]);
		expect(tree.map((node) => node.uid)).toEqual(['orphan']);
	});
});

describe('search', () => {
	it('matches the name without regard to accents or case', () => {
		expect(searchConcerns(CONCERNS, 'DEPRESSION').map((c) => c.uid)).toEqual(['depression']);
	});

	it('matches a synonym, and the node keeps its own name', () => {
		const found = searchConcerns(CONCERNS, 'toxico');
		expect(found.map((c) => c.uid)).toEqual(['addictions']);
		expect(found[0].name).toBe('Addictions');
	});

	it('an empty term finds nothing to narrow', () => {
		expect(searchConcerns(CONCERNS, '  ')).toEqual([]);
	});
});

describe('selecting', () => {
	const entries = ['e1', 'e2', 'e3', 'e4', 'e5'].map((uid) => makeEntry({ uid }));

	it('keeps the entries of the node and of its descendants', () => {
		expect(filterByConcern(entries, CONCERNS, 'addictions').map((e) => e.uid)).toEqual(['e1', 'e2']);
		expect(filterByConcern(entries, CONCERNS, 'alcool').map((e) => e.uid)).toEqual(['e1']);
	});

	it('keeps every entry when nothing is picked', () => {
		expect(filterByConcern(entries, CONCERNS, null)).toBe(entries);
	});

	it('keeps none when the node is not offered', () => {
		expect(filterByConcern(entries, CONCERNS, 'gone')).toEqual([]);
	});
});

describe('voir aussi', () => {
	const entries = ['e1', 'e2', 'e3', 'e4'].map((uid) => makeEntry({ uid }));

	it('lists the situations a picked condition can lead to, with the entries that manage them', () => {
		const also = seeAlsoOf(entries, CONCERNS, 'depression');
		expect(also.map((item) => item.concern.uid)).toEqual(['crise']);
		expect(also[0].entries.map((e) => e.uid)).toEqual(['e4']);
	});

	it('is empty when nothing is picked or the node leads nowhere', () => {
		expect(seeAlsoOf(entries, CONCERNS, null)).toEqual([]);
		expect(seeAlsoOf(entries, CONCERNS, 'alcool')).toEqual([]);
	});

	it('leaves out an entry the list does not hold, like one another selector filtered away', () => {
		const some = entries.filter((e) => e.uid !== 'e4');
		expect(seeAlsoOf(some, CONCERNS, 'depression')).toEqual([]);
	});
});
