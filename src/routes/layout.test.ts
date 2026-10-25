/**
 * The root universal load's answer is what pages see as `page.data`, not the
 * server load's. It used to list the server's keys by hand, and whatever it
 * forgot never reached a page: `theme` once, then the site's sharing card,
 * which left every page without a card of its own sharing nothing at all.
 * Every key the server load returns now passes through, present or future.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$lib/version', () => ({ checkVersion: () => {} }));

import { load } from './+layout.ts';

const serverData = {
	user: { username: 'alice' },
	session: null,
	organization: { name: 'CPTS' },
	directory: { inputField: { situation: false } },
	entries: [],
	labels: {},
	openGraph: { title: 'Maison de santé' },
	situations: undefined,
	dismissedAlerts: [],
	theme: 'light',
	aKeyAddedLater: 42
};

describe('the root universal load', () => {
	it('hands pages every key the server load returned', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		const data = (await load({ fetch, data: serverData, depends: () => {} } as never)) as Record<string, unknown>;
		expect(data).toMatchObject(serverData);
	});
});
