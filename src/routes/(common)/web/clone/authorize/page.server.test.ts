import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/paths', () => ({ resolve: (path: string) => `/this-instance-base/${path}` }));

import { load } from './+page.server';

/**
 * The consent page on the source carries the directory the target asked to read.
 *
 * Under its own name: a page's data overrides the layout's key for key, and the
 * layout's `directory` is the site's Directory object, which the footer reads
 * (`page.data.directory.setting.path`). Returned as `directory`, the requested name
 * replaced it and the page answered 500 to every clone that named a directory.
 */
const run = (search: string, signedIn = true, path = '/web/clone/authorize') =>
	load({
		locals: { auth: async () => (signedIn ? { user: { email: 'su@example.org' } } : null) },
		url: new URL(`https://dev.example.org${path}${search}`)
	} as never) as Promise<Record<string, unknown>>;

const redirectedTo = async (promise: Promise<unknown>): Promise<URL> => {
	try {
		await promise;
	} catch (e) {
		return new URL((e as { location: string }).location, 'https://dev.example.org');
	}
	throw new Error('did not redirect');
};

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

	describe('asked by someone not signed in', () => {
		const asked =
			'?target=https%3A%2F%2Fstaging.example.org&return=%2Fannuaire%2Fweb%2Fclone%2Fcallback' +
			'&instance=dev&directory=cpts-lyon-3';

		it('signs them in and brings them back with every parameter it was asked with', async () => {
			const signin = await redirectedTo(run(asked, false));

			const back = new URL(signin.searchParams.get('redirectTo')!, 'https://dev.example.org');
			expect(Object.fromEntries(back.searchParams)).toEqual({
				target: 'https://staging.example.org',
				return: '/annuaire/web/clone/callback',
				instance: 'dev',
				directory: 'cpts-lyon-3'
			});
		});

		it('leaves the sign-in page with nothing but the way back', async () => {
			const signin = await redirectedTo(run(asked, false));

			expect([...signin.searchParams.keys()]).toEqual(['redirectTo']);
		});

		it('comes back to the page under the base path it is served from, once', async () => {
			const signin = await redirectedTo(run(asked, false, '/annuaire/web/clone/authorize'));

			expect(new URL(signin.searchParams.get('redirectTo')!, 'https://dev.example.org').pathname).toBe(
				'/annuaire/web/clone/authorize'
			);
		});
	});

	describe('the way back to the target', () => {
		it('is the path the target asked for, which is under the target’s own base path', async () => {
			const data = await run(
				'?target=https%3A%2F%2Fstaging.example.org&return=%2Fannuaire%2Fweb%2Fclone%2Fcallback'
			);

			expect(data.returnTo).toBe('/annuaire/web/clone/callback');
		});

		it('is not guessed from this instance’s base path when the target asked for nothing', async () => {
			const data = await run('?target=https%3A%2F%2Fstaging.example.org');

			expect(data.returnTo).toBe('');
			expect(data.targetError).toMatch(/return path/);
		});

		it.each(['https%3A%2F%2Fevil.example%2Fx', '%2F%2Fevil.example%2Fx', 'callback'])(
			'is never an address on another host: %s',
			async (asked) => {
				const data = await run(`?target=https%3A%2F%2Fstaging.example.org&return=${asked}`);

				expect(data.returnTo).toBe('');
				expect(data.targetError).toMatch(/return path/);
			}
		);
	});

	describe('declining', () => {
		it('goes back to the target’s own app, not to the root of its domain', async () => {
			const data = await run(
				'?target=https%3A%2F%2Funipa.fr&return=%2Fannuaire%2Fweb%2Fclone%2Fcallback'
			);

			expect(data.cancelUrl).toBe('https://unipa.fr/annuaire/web/clone/callback');
		});
	});
});
