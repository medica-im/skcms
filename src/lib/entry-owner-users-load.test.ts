import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Who the owner/creator panel on an entry page is told about.
 *
 * The panel is handed two lists of user uids — `owner` and `creator` — and has
 * to show one row per person. It used to resolve those uids itself, from the
 * component, with the `getUser` remote query awaited inside an `{#await}`.
 *
 * That could not work on this page, for a reason that has nothing to do with
 * authorization — which is where the investigation kept going, because the
 * symptom was an empty panel and `getUser` swallowed every non-OK response:
 *
 *   - `{#await}` does not block SSR. Svelte renders the *pending* branch on the
 *     server and never resolves the promise there, so the server-rendered page
 *     shipped "Chargement..." and nothing else. Verified against the running
 *     dev server: the SSR'd html for /annuaire/e/aurelie-ferriz-apa-01 contains
 *     "Chargement" and never the owner's name.
 *   - so the rows could only ever be filled by a second, client-side round
 *     trip to `/_app/remote/<hash>/getUser`, one request per uid, after
 *     hydration. On a site served under a base path that request is the
 *     fragile one, and when it failed the panel rendered "Aucun utilisateur
 *     associé" — indistinguishable from an entry that genuinely has none,
 *     because `getUser` returned `undefined` on any non-OK status rather than
 *     throwing.
 *
 * The backend was never at fault: as a unipa administrator every
 * `GET /api/v2/users/{uid}` for the entry's owners answers 200, and the
 * `users_v2` AccessControl row grants superuser and administrator 15.
 *
 * So the users are resolved in the page's server load instead, on the same
 * request that already fetches the entry with the visitor's cookie — the path
 * that demonstrably works. This is the same call the codebase already made
 * twice for the same reason: the access history (see the note in
 * user.remote.ts) and the facility edit-permission check (facility.remote.ts),
 * both moved out of remote queries because the answer arrived after rendering.
 *
 * These tests pin the load's contract, which is what the panel now depends on:
 * the entry's owner and creator uids come back as resolved users, marked with
 * which of the two roles each holds.
 */

const ENTRY_UID = 'a4023700b0524617b372fb46c602031d';
const ALICE = 'cb5927c3072f42b183fb86566556eea3';
const BRUNO = '98244038747b43fdbd3a27b78831d68d';

const user = (uid: string, name: string) => ({
	uid,
	name,
	email: `${uid}@example.org`,
	access: [{ role: 'staff' }]
});

const USERS: Record<string, unknown> = {
	[ALICE]: user(ALICE, 'Alice Martin'),
	[BRUNO]: user(BRUNO, 'Bruno Petit')
};

/** The entry payload /api/v2/fullentries/slug/{slug} returns, trimmed. */
const fullentry = (owner: string[] | null, creator: string[] | null) => ({
	uid: ENTRY_UID,
	slug: 'aurelie-ferriz-apa-01',
	name: 'Aurélie Ferriz',
	effector_uid: 'e-1',
	effector_type: { uid: 't-1', slug: 'apa', label: 'IPA' },
	owner,
	creator,
	memberships: null
});

vi.mock('$lib/utils/constants.ts', () => ({
	variables: { BASE_URI: 'https://backend.test' }
}));

vi.mock('$lib/utils/request', () => ({
	authReq: (url: string, method: string) => new Request(url, { method })
}));

/**
 * A backend that answers the entry and the user lookups, and records what was
 * asked of it. `globalThis.fetch` and not the load's `fetch`: the load reaches
 * the API through `globalThis.fetch(authReq(...))`, which is what forwards the
 * session cookie.
 */
function backend(owner: string[] | null, creator: string[] | null) {
	const asked: string[] = [];
	const fetcher = vi.fn(async (input: Request | string) => {
		const url = typeof input === 'string' ? input : input.url;
		asked.push(url);
		if (url.includes('/fullentries/slug/')) {
			return new Response(JSON.stringify(fullentry(owner, creator)), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		}
		const uid = url.split('/api/v2/users/')[1];
		if (uid && USERS[uid]) {
			return new Response(JSON.stringify(USERS[uid]), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		}
		return new Response(JSON.stringify({ detail: 'not found' }), { status: 404 });
	});
	return { asked, fetcher };
}

/**
 * The load's event, with only what this load reads.
 *
 * `role` is the visitor's, from the parent layout — which already resolves it
 * via /api/v2/users/me. It matters here because the panel these users feed is
 * rendered only for a superuser or an administrator, so it decides whether the
 * lookups should happen at all.
 */
const event = (fetcher: typeof fetch, role: string | null) => ({
	fetch: fetcher,
	params: { slug: 'aurelie-ferriz-apa-01' },
	cookies: { getAll: () => [] },
	parent: async () => ({ entries: [], user: role ? { uid: 'me', role } : undefined }),
	depends: () => {},
	url: new URL('https://dev.unipa.fr/annuaire/e/aurelie-ferriz-apa-01')
});

/** Administrator by default: the visitor the owner panel is rendered for. */
async function runLoad(
	owner: string[] | null,
	creator: string[] | null,
	role: string | null = 'administrator'
) {
	const { asked, fetcher } = backend(owner, creator);
	const original = globalThis.fetch;
	globalThis.fetch = fetcher as unknown as typeof fetch;
	try {
		const { load } = await import('../routes/(common)/e/[slug]/+page.server.ts');
		const result = await (load as any)(event(fetcher as unknown as typeof fetch, role));
		return { result, asked };
	} finally {
		globalThis.fetch = original;
	}
}

beforeEach(() => {
	vi.resetModules();
});

describe('the entry page load, on owners and creators', () => {
	it('resolves the owner uids into users', async () => {
		// The bug at its simplest: an entry with one owner showed none, because
		// nothing on the server ever looked the uid up.
		const { result } = await runLoad([ALICE], []);

		expect(result.users).toEqual([
			expect.objectContaining({ uid: ALICE, name: 'Alice Martin', isOwner: true, isCreator: false })
		]);
	});

	it('marks an owner and a creator who are different people', async () => {
		const { result } = await runLoad([ALICE], [BRUNO]);

		expect(result.users).toEqual([
			expect.objectContaining({ uid: ALICE, isOwner: true, isCreator: false }),
			expect.objectContaining({ uid: BRUNO, isOwner: false, isCreator: true })
		]);
	});

	it('names somebody who is both, once', async () => {
		// The union is computed from two lists, and whoever created an entry
		// usually still owns it — so a row per list would double the common
		// case rather than marking one row twice.
		const { result, asked } = await runLoad([ALICE], [ALICE]);

		expect(result.users).toEqual([
			expect.objectContaining({ uid: ALICE, isOwner: true, isCreator: true })
		]);
		// One lookup per person, not per mention.
		expect(asked.filter((u) => u.includes(`/users/${ALICE}`))).toHaveLength(1);
	});

	it('returns no users, and asks for none, when the entry names nobody', async () => {
		// Both fields are `list[str] | None` on the backend and a new entry can
		// carry neither.
		const { result, asked } = await runLoad(null, null);

		expect(result.users).toEqual([]);
		expect(asked.some((u) => u.includes('/api/v2/users/'))).toBe(false);
	});

	it('still names the users it could resolve when one lookup 404s', async () => {
		// A uid naming a user the API will not return must not take the rest of
		// the list down with it — somebody may have been deleted while an entry
		// still names them.
		const { result } = await runLoad([ALICE, 'u-gone'], []);

		expect(result.users).toEqual([expect.objectContaining({ uid: ALICE })]);
	});

	it('serves an anonymous visitor the page, asking for no users at all', async () => {
		// The regression this pins. /api/v2/users/{uid} answers 401 to an
		// anonymous caller, and resolving here throws on anything that is not
		// 200 or 404 — so making a failed lookup loud turned every public entry
		// page into a 500. The panel these users feed is rendered only for a
		// superuser or an administrator, so for everybody else the lookups are
		// both fatal and pointless: the right move is not to ask.
		const { result, asked } = await runLoad([ALICE], [BRUNO], null);

		expect(result.fullentry.slug).toBe('aurelie-ferriz-apa-01');
		expect(result.users).toEqual([]);
		expect(asked.some((u) => u.includes('/api/v2/users/'))).toBe(false);
	});

	it('asks for no users for a signed-in visitor who is not an admin', async () => {
		// Staff and registered users see the entry page but not this panel, so
		// the same reasoning applies — and unlike the anonymous case their
		// lookups might even succeed, which would make the waste invisible.
		for (const role of ['staff', 'registered']) {
			const { result, asked } = await runLoad([ALICE], [BRUNO], role);
			expect(result.users, role).toEqual([]);
			expect(asked.some((u) => u.includes('/api/v2/users/')), role).toBe(false);
		}
	});

	it('resolves them for a superuser too, not only an administrator', async () => {
		// Both roles render the panel, so both must be served its data.
		const { result } = await runLoad([ALICE], [], 'superuser');

		expect(result.users).toEqual([
			expect.objectContaining({ uid: ALICE, isOwner: true })
		]);
	});

	it('resolves them on the server, so the panel needs no second round trip', async () => {
		// The whole point of the move. The page is server-rendered, and
		// `{#await}` in the component could never resolve during SSR — it
		// renders its pending branch and stops. Asking here means the rows are
		// in the html.
		const { asked } = await runLoad([ALICE], [BRUNO]);

		expect(asked).toContain(`https://backend.test/api/v2/users/${ALICE}`);
		expect(asked).toContain(`https://backend.test/api/v2/users/${BRUNO}`);
	});
});
