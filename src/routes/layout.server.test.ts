/**
 * The root layout's data, loaded on every server-rendered page: the user,
 * the entries, the organization, the directory, the labels and the session.
 * None of them waits for another, so they are asked for together and the
 * page waits for the slowest rather than for their sum. Only the situations
 * wait, for the directory to say it uses them. One request failing leaves
 * the others' data whole.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/utils/appUrl', () => ({ APP_URL: 'https://api.test' }));

import { load } from './+layout.server.ts';

type Held = { path: string; answer: (body: unknown, status?: number) => void };
let held: Held[];
let authAsked: boolean;
let releaseAuth: (session: unknown) => void;

const fakeFetch = (input: RequestInfo | URL) =>
	new Promise<Response>((resolve) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		held.push({
			path: new URL(url).pathname,
			answer: (body, status = 200) => resolve(new Response(JSON.stringify(body), { status }))
		});
	});

const started = () => held.map((h) => h.path);
const answer = (path: string, body: unknown, status = 200) => held.find((h) => h.path === path)!.answer(body, status);

const INDEPENDENT = ['/api/v2/users/me', '/api/v2/entries', '/api/v2/organization', '/api/v1/directory/', '/api/v2/effector-type-labels'];

const event = (dismissed?: string) =>
	({
		fetch: fakeFetch,
		cookies: { getAll: () => [], get: (name: string) => (name === 'dismissed-alerts' ? dismissed : undefined) },
		depends: () => {},
		locals: {
			theme: 'light',
			auth: () => {
				authAsked = true;
				return new Promise((resolve) => (releaseAuth = resolve));
			}
		}
	}) as never;

const answerAll = (directory: unknown = { inputField: { situation: false } }) => {
	answer('/api/v2/users/me', { username: 'alice' });
	answer('/api/v2/entries', [{ name: 'Alice Martin' }]);
	answer('/api/v2/organization', { name: 'CPTS' });
	answer('/api/v1/directory/', directory);
	answer('/api/v2/effector-type-labels', { t: {} });
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

		await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), { timeout: 1000 });
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

	it('asks for the situations once the directory says it uses them', async () => {
		const loading = load(event());
		await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), { timeout: 1000 });

		answerAll({ inputField: { situation: true } });
		await vi.waitFor(() => expect(started()).toContain('/api/v2/situations'), { timeout: 1000 });
		answer('/api/v2/situations', [{ uid: 's1' }]);

		expect(((await loading) as Record<string, unknown>).situations).toEqual([{ uid: 's1' }]);
	});

	it('tells every page which alerts the visitor has closed, read from their cookie', async () => {
		const loading = load(event('association-alert-v1'));
		await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), { timeout: 1000 });
		answerAll();

		expect(((await loading) as Record<string, unknown>).dismissedAlerts).toEqual(['association-alert-v1']);
	});

	it('keeps the rest when one request fails', async () => {
		const loading = load(event());
		await vi.waitFor(() => expect(started()).toEqual(expect.arrayContaining(INDEPENDENT)), { timeout: 1000 });

		answer('/api/v2/organization', { detail: 'boom' }, 500);
		answer('/api/v2/users/me', { username: 'alice' });
		answer('/api/v2/entries', [{ name: 'Alice Martin' }]);
		answer('/api/v1/directory/', { inputField: { situation: false } });
		answer('/api/v2/effector-type-labels', { t: {} });
		releaseAuth(null);

		const data = (await loading) as Record<string, unknown>;
		expect(data.organization).toBeUndefined();
		expect(data.user).toEqual({ username: 'alice' });
		expect(data.labels).toEqual({ t: {} });
	});
});
