import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/paths', () => ({ resolve: (path: string) => `/${path}` }));

import { load } from './+page.server';

/**
 * The consent page on the source carries the directory the target asked to read.
 *
 * Under its own name: a page's data overrides the layout's key for key, and the
 * layout's `directory` is the site's Directory object, which the footer reads
 * (`page.data.directory.setting.path`). Returned as `directory`, the requested name
 * replaced it and the page answered 500 to every clone that named a directory.
 */
const run = (search: string) =>
	load({
		locals: { auth: async () => ({ user: { email: 'su@example.org' } }) },
		url: new URL(`https://dev.example.org/web/clone/authorize${search}`)
	} as never) as Promise<Record<string, unknown>>;

describe('the clone consent page', () => {
	it('keeps the requested directory under its own name, leaving the layout’s directory alone', async () => {
		const data = await run(
			'?target=https%3A%2F%2Fstaging.example.org&instance=dev&directory=cpts-lyon-3-sante-mentale'
		);
		expect(data.sourceDirectory).toBe('cpts-lyon-3-sante-mentale');
		expect(data).not.toHaveProperty('directory');
	});

	it('has no directory when the target named none', async () => {
		const data = await run('?target=https%3A%2F%2Fstaging.example.org&instance=dev');
		expect(data.sourceDirectory).toBe('');
	});
});
