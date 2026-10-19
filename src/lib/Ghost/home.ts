import { TSGhostAdminAPI } from '@ts-ghost/admin-api';
import { getGhostData } from './ghost';

/** A home page's blog: its latest posts and its own description, asked for together. */
export async function ghostHome(
	fetch: typeof globalThis.fetch,
	blog: { uri: string; contentKey: string; adminKey: string; count: number }
) {
	if (!blog.uri) return { ghost: null, ghostSite: null };
	const [ghost, ghostSite] = await Promise.all([
		getGhostData(fetch, blog.uri, blog.contentKey, blog.count),
		// The blog's title comes from the admin API. Without its key the posts
		// still show, under a heading without the title.
		blog.adminKey ? new TSGhostAdminAPI(blog.uri, blog.adminKey, 'v5.0').site.fetch() : null
	]);
	return { ghost, ghostSite };
}
