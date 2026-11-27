import { describe, it, expect } from 'vitest';
import { tagGroupsForType } from './tagsForType.ts';

const category = (uid: string, effector_types: string[] | null) => ({
	uid,
	name: uid,
	label: `label ${uid}`,
	labelShort: uid,
	effector_types
});
const tag = (uid: string, categoryUid: string) => ({
	uid,
	name: uid,
	label: `label ${uid}`,
	labelShort: `short ${uid}`,
	category: categoryUid
});

const categories = [
	category('mention-ipa', ['ipa']),
	category('specialite', ['ipa', 'medecin']),
	category('unlinked', null)
];
const tags = [
	tag('pcs', 'mention-ipa'),
	tag('onco', 'mention-ipa'),
	tag('geriatrie', 'specialite'),
	tag('stray', 'unlinked')
];

describe('tagGroupsForType', () => {
	it("offers the tags of the type's own category, grouped under it", () => {
		const groups = tagGroupsForType(categories, tags, 'medecin');
		expect(groups.map((g) => g.category.uid)).toEqual(['specialite']);
		expect(groups[0].tags.map((t) => t.uid)).toEqual(['geriatrie']);
	});

	it('keeps one group per linked category', () => {
		const groups = tagGroupsForType(categories, tags, 'ipa');
		expect(groups.map((g) => g.category.uid)).toEqual(['mention-ipa', 'specialite']);
		expect(groups[0].tags.map((t) => t.uid)).toEqual(['pcs', 'onco']);
	});

	it('offers nothing to a type no category belongs to', () => {
		expect(tagGroupsForType(categories, tags, 'kine')).toEqual([]);
	});

	it('leaves out a linked category that has no tag yet', () => {
		const empty = [...categories, category('empty', ['kine'])];
		expect(tagGroupsForType(empty, tags, 'kine')).toEqual([]);
	});
});
