/**
 * A home page's blog: its latest posts and the blog's own description,
 * both from Ghost. Neither waits for the other, so they are asked for
 * together and the page waits for the slower, not for both in turn. A
 * site without a blog asks Ghost nothing.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { asked, release } = vi.hoisted(() => {
	const asked: string[] = [];
	const release: Record<string, (value: unknown) => void> = {};
	return { asked, release };
});
const held = (name: string) =>
	new Promise((resolve) => {
		asked.push(name);
		release[name] = resolve;
	});

vi.mock('./ghost', () => ({ getGhostData: () => held('posts') }));
vi.mock('@ts-ghost/admin-api', () => ({
	TSGhostAdminAPI: class {
		site = { fetch: () => held('site') };
	}
}));

import { ghostHome } from './home';

const blog = { uri: 'https://example.org/blog', contentKey: 'c', adminKey: 'a', count: 6 };

beforeEach(() => (asked.length = 0));

describe('ghostHome', () => {
	it('asks Ghost for the posts and the site together', async () => {
		const loading = ghostHome(fetch, blog);

		await vi.waitFor(() => expect(asked).toEqual(expect.arrayContaining(['posts', 'site'])), { timeout: 1000 });
		release.posts([{ title: 'Canicule' }]);
		release.site({ title: 'CPTS' });

		expect(await loading).toEqual({ ghost: [{ title: 'Canicule' }], ghostSite: { title: 'CPTS' } });
	});

	it('still gives the posts without an admin key, only without the site', async () => {
		const loading = ghostHome(fetch, { ...blog, adminKey: '' });

		await vi.waitFor(() => expect(asked).toEqual(['posts']), { timeout: 1000 });
		release.posts([{ title: 'Canicule' }]);

		expect(await loading).toEqual({ ghost: [{ title: 'Canicule' }], ghostSite: null });
	});

	it('asks nothing of a site without a blog', async () => {
		expect(await ghostHome(fetch, { ...blog, uri: '' })).toEqual({ ghost: null, ghostSite: null });
		expect(asked).toEqual([]);
	});
});
