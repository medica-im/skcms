import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

/**
 * The owner / creator panel on an entry page.
 *
 * It is handed two lists of user uids — `owner` and `creator` — and turns them
 * into one row per person, marking which of the two roles each holds. Somebody
 * can be both, which is the normal case: whoever created an entry usually still
 * owns it.
 *
 * Written because the panel showed "Aucun utilisateur associé" for an entry
 * that had an owner, and kept showing it after a reload — while the modal that
 * edits owners listed that same person correctly. Two separate causes, and the
 * split between panel and modal is what pointed at them:
 *
 *   - the panel read the `getUser` remote query with a one-shot `await` inside
 *     an `$effect`, copying the result into local state. The modal called the
 *     same kind of query from a click handler, which re-runs every time it
 *     opens — so the modal was right and the panel was stale;
 *   - `getUser` logged and fell through on any non-OK response, returning
 *     `undefined`. A 401 was therefore indistinguishable from "no such user",
 *     and the panel's `if (user)` dropped the row without its `catch` ever
 *     firing. Nothing on screen, nothing in the error path.
 *
 * So the assertions below are about what the reader sees for a given set of
 * uids, and — the part that regressed — that a changed set produces changed
 * rows. `getUser` is mocked: it is a remote query needing a request event and a
 * cookie, neither of which a component runner has, and what is under test is
 * the assembling of rows rather than the fetch.
 */

const getUser = vi.hoisted(() => vi.fn());
const getUsers = vi.hoisted(() => vi.fn(async () => []));

// The whole module, not just `getUser`: the panel renders PatchOwnerModal in
// edit mode, which imports `getUsers` from here, and a partial mock leaves that
// import unresolved at load time.
vi.mock('../../../user.remote.ts', () => ({
	getUser,
	getUsers,
	changeUserRole: vi.fn(),
	suspendUser: vi.fn(),
	restoreUser: vi.fn()
}));

import CreatorOwner from './CreatorOwner.svelte';

/**
 * A user as /api/v2/users/{uid} returns one, trimmed to what the panel reads.
 *
 * `name`, which is what the User interface declares and the row renders — the
 * first draft of this fixture said `formatted_name`, borrowed from the contact
 * payloads, and every row then showed the "—" placeholder while the email and
 * the role badge beside it were right. A fixture that half-matches the real
 * shape fails in a way that looks like a component bug.
 */
const user = (uid: string, name: string) => ({
	uid,
	name,
	email: `${uid}@example.org`,
	access: [{ role: 'staff' }]
});

const ALICE = user('u-alice', 'Alice Martin');
const BRUNO = user('u-bruno', 'Bruno Petit');

beforeEach(() => {
	getUser.mockReset();
	getUser.mockImplementation(
		async (uid: string) => ({ 'u-alice': ALICE, 'u-bruno': BRUNO })[uid]
	);
});

describe('the owner / creator panel', () => {
	it('names the owner of an entry', async () => {
		// The bug, at its simplest: an entry with one owner showed none.
		render(CreatorOwner, { owner: ['u-alice'], creator: [] });
		await expect.element(page.getByText('Alice Martin')).toBeVisible();
	});

	it('names an owner and a creator who are different people', async () => {
		render(CreatorOwner, { owner: ['u-alice'], creator: ['u-bruno'] });
		await expect.element(page.getByText('Alice Martin')).toBeVisible();
		await expect.element(page.getByText('Bruno Petit')).toBeVisible();
	});

	it('shows somebody who is both, once', async () => {
		// The union is computed from two lists, so a row per list would double
		// the common case rather than marking one row twice.
		render(CreatorOwner, { owner: ['u-alice'], creator: ['u-alice'] });
		await expect.element(page.getByText('Alice Martin')).toBeVisible();
		expect(page.getByText('Alice Martin').elements()).toHaveLength(1);
	});

	it('adds a row when a uid starts being named', async () => {
		// What broke. Adding an owner re-runs the query upstream and hands this
		// panel new props; a panel that had copied the old answer into state
		// kept showing it — which is exactly "not even after a reload".
		const { rerender } = await render(CreatorOwner, { owner: ['u-alice'], creator: [] });
		await expect.element(page.getByText('Alice Martin')).toBeVisible();

		await rerender({ owner: ['u-alice', 'u-bruno'], creator: [] });

		await expect.element(page.getByText('Bruno Petit')).toBeVisible();
	});

	it('drops a row when the uid stops being named', async () => {
		const { rerender } = await render(CreatorOwner, {
			owner: ['u-alice', 'u-bruno'],
			creator: []
		});
		await expect.element(page.getByText('Bruno Petit')).toBeVisible();

		await rerender({ owner: ['u-alice'], creator: [] });

		await expect.element(page.getByText('Alice Martin')).toBeVisible();
		await expect.element(page.getByText('Bruno Petit')).not.toBeInTheDocument();
	});

	it('says so when an entry has no owner and no creator', async () => {
		// Both props are `string[] | null` and a new entry can carry neither.
		// The empty message is correct *here* — the bug was showing it while an
		// owner existed, so this pins the case it is actually for.
		render(CreatorOwner, { owner: null, creator: null });
		await expect.element(page.getByText('Aucun utilisateur associé.')).toBeVisible();
		expect(getUser).not.toHaveBeenCalled();
	});

	it('still names the users it could resolve when one lookup fails', async () => {
		// A uid naming a user the API will not return must not take the rest of
		// the list down with it.
		getUser.mockImplementation(async (uid: string) =>
			uid === 'u-alice' ? ALICE : undefined
		);
		render(CreatorOwner, { owner: ['u-alice', 'u-gone'], creator: [] });

		await expect.element(page.getByText('Alice Martin')).toBeVisible();
	});
});
