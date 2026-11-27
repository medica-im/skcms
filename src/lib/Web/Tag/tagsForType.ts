import type { TagCategory } from '#lib/store/directoryStoreInterface.ts';

/** A tag as GET /api/v2/tags returns it: its category is the category's uid. */
export interface ApiTag {
	uid: string;
	name: string;
	label: string;
	labelShort: string | null;
	category: string;
}

export interface TagGroup<T extends ApiTag = ApiTag> {
	category: TagCategory;
	tags: T[];
}

/** The categories linked to the effector type that have tags, each with its own tags. */
export function tagGroupsForType<T extends ApiTag>(
	categories: TagCategory[],
	tags: T[],
	effectorType: string
): TagGroup<T>[] {
	return categories
		.filter((c) => c.effector_types?.includes(effectorType))
		.map((category) => ({ category, tags: tags.filter((t) => t.category === category.uid) }))
		.filter((group) => group.tags.length > 0);
}
