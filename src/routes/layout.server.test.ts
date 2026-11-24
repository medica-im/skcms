/**
 * The root layout's data, loaded on every server-rendered page: the user,
 * the entries, the organization, the directory, the labels and the session.
 * None of them waits for another, so they are asked for together and the
 * page waits for the slowest rather than for their sum. Only the situations
 * wait, for the directory to say it uses them. One request failing leaves
 * the others' data whole.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/utils/appUrl', () => ({ APP_URL: 'https://api.test' }));

import { load } from './+layout.server.ts';

type Held = { path: string; answer: (body: unknown, status?: number) => void };
let held: Held[];
let authAsked: boolean;
let releaseAuth: (session: unknown) => void;

const USER = '/api/v2/users/me';

// The user is asked for only once the session is known, so it is answered as
// soon as it is asked rather than held with the requests that go out at once.
const fakeFetch = (input: RequestInfo | URL) =>
	new Promise<Response>((resolve) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		if (new URL(url).pathname === USER) {
			held.push({ path: USER, answer: () => {} });
			resolve(new Response(JSON.stringify({ username: 'alice' })));
			return;
		}
		held.push({
			path: new URL(url).pathname,
			answer: (body, status = 200) =>
				resolve(new Response(status === 204 ? null : JSON.stringify(body), { status }))
		});
	});

const started = () => held.map((h) => h.path);
const answer = (path: string, body: unknown, status = 200) =>
	held.find((h) => h.path === path)!.answer(body, status);

const INDEPENDENT = [
	'/api/v2/entries',
	'/api/v2/organization',
	'/api/v1/directory/',
	'/api/v2/effector-type-labels',
	'/api/v2/opengraph'
];

const event = (dismissed?: string) =>
	({
		fetch: fakeFetch,
		cookies: {
			getAll: () => [],
			get: (name: string) => (name === 'dismissed-alerts' ? dismissed : undefined)
		},
		depends: () => {},
		locals: {
			theme: 'light',
			auth: () => {
				authAsked = true;
				return new Promise((resolve) => (releaseAuth = resolve));
			}
		}
	}) as never;

const CARD = { title: 'Maison de santé' };

const answerAll = (
	directory: unknown = { inputField: { situation: false } },
	card: unknown = CARD
) => {
	answer('/api/v2/entries', [{ name: 'Alice Martin' }]);
	answer('/api/v2/organization', { name: 'CPTS' });
	answer('/api/v1/directory/', directory);
	answer('/api/v2/effector-type-labels', { t: {} });
	answer('/api/v2/opengraph', card, card === null ? 204 : 200);
	releaseAuth({ user: { email: 'alice@example.org' } });
};

beforeEach(() => {
	held = [];
	authAsked = false;
	vi.stubGlobal('fetch', fakeFetch);
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('the root layout’s data', () => {
	it('is asked for all at once, none waiting for another', async () => {
		const loading = load(event());

		await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), {
			timeout: 1000
		});
		expect(authAsked).toBe(true);

		answerAll();
		const data = (await loading) as Record<string, unknown>;
		expect(data.user).toEqual({ username: 'alice' });
		expect(data.entries).toEqual([{ name: 'Alice Martin' }]);
		expect(data.organization).toEqual({ name: 'CPTS' });
		expect(data.labels).toEqual({ t: {} });
		expect(data.session).toEqual({ user: { email: 'alice@example.org' } });
		expect(data.situations).toBeUndefined();
		expect(started()).not.toContain('/api/v2/situations');
	});

	it('does not ask the backend who a visitor is when they have no session', async () => {
		const loading = load(event());
		await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), {
			timeout: 1000
		});

		releaseAuth(null);
		answer('/api/v2/entries', [{ name: 'Alice Martin' }]);
		answer('/api/v2/organization', { name: 'CPTS' });
		answer('/api/v1/directory/', { inputField: { situation: false } });
		answer('/api/v2/effector-type-labels', { t: {} });
		answer('/api/v2/opengraph', CARD);

		const data = (await loading) as Record<string, unknown>;
		expect(started()).not.toContain(USER);
		expect(data.user).toBeUndefined();
		expect(data.organization).toEqual({ name: 'CPTS' });
	});

	it('warns when the backend rejects the session of a signed-in user', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubGlobal('fetch', (input: RequestInfo | URL) =>
			new URL(input instanceof Request ? input.url : String(input)).pathname === USER
				? Promise.resolve(new Response('{}', { status: 401 }))
				: fakeFetch(input)
		);
		const loading = load(event());
		await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), {
			timeout: 1000
		});
		answerAll();

		const data = (await loading) as Record<string, unknown>;
		expect(data.user).toBeUndefined();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('rejected the session'));
	});

	it('asks for the situations once the directory says it uses them', async () => {
		const loading = load(event());
		await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), {
			timeout: 1000
		});

		answerAll({ inputField: { situation: true } });
		await vi.waitFor(() => expect(started()).toContain('/api/v2/situations'), { timeout: 1000 });
		answer('/api/v2/situations', [{ uid: 's1' }]);

		expect(((await loading) as Record<string, unknown>).situations).toEqual([{ uid: 's1' }]);
	});

	it('tells every page which alerts the visitor has closed, read from their cookie', async () => {
		const loading = load(event('association-alert-v1'));
		await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), {
			timeout: 1000
		});
		answerAll();

		expect(((await loading) as Record<string, unknown>).dismissedAlerts).toEqual([
			'association-alert-v1'
		]);
	});

	it("hands every page the site's sharing card, asked for by the server alone", async () => {
		const loading = load(event());
		await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), {
			timeout: 1000
		});
		answerAll();

		expect(((await loading) as Record<string, unknown>).openGraph).toEqual(CARD);
	});

	it('hands no card on a site without one', async () => {
		const loading = load(event());
		await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), {
			timeout: 1000
		});
		answerAll(undefined, null);

		expect(((await loading) as Record<string, unknown>).openGraph).toBeUndefined();
	});

	it('keeps the rest when one request fails', async () => {
		const loading = load(event());
		await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), {
			timeout: 1000
		});

		answer('/api/v2/organization', { detail: 'boom' }, 500);
		answer('/api/v2/entries', [{ name: 'Alice Martin' }]);
		answer('/api/v1/directory/', { inputField: { situation: false } });
		answer('/api/v2/effector-type-labels', { t: {} });
		answer('/api/v2/opengraph', CARD);
		releaseAuth({ user: { email: 'alice@example.org' } });

		const data = (await loading) as Record<string, unknown>;
		expect(data.organization).toBeUndefined();
		expect(data.user).toEqual({ username: 'alice' });
		expect(data.labels).toEqual({ t: {} });
	});

	it.each([502, 503, 504])(
		'says the backend is offline, and whose, when its proxy answers %i',
		async (status) => {
			const loading = load(event());
			const refused = expect(loading).rejects.toMatchObject({
				status: 503,
				body: { message: expect.stringContaining('api.test') }
			});
			await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), {
				timeout: 1000
			});

			answer('/api/v2/organization', '<html>Bad Gateway</html>', status);
			await refused;
		}
	);
});
