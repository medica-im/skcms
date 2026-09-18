import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import CreatorOwner from './CreatorOwner.svelte';
import type { UserWithRoles } from './ownerCreator.ts';

/**
 * The owner / creator panel on an entry page.
 *
 * It is handed the entry's owner uids and a list of already-resolved users,
 * each marked with which of the two capacities they hold, and turns them into
 * one row per person. Somebody can be both, which is the normal case: whoever
 * created an entry usually still owns it.
 *
 * Written because the panel showed "Aucun utilisateur associé" for an entry
 * that had an owner, and kept showing it after a reload — while the modal that
 * edits owners listed that same person correctly. The panel resolved the uids
 * itself back then, awaiting the `getUser` remote query once per uid, and that
 * shape could not work on this page for two compounding reasons:
 *
 *   - `{#await}` does not block SSR. Svelte renders the pending branch on the
 *     server and never resolves the promise there, so the server-rendered html
 *     shipped "Chargement..." and the rows could only ever be filled by a
 *     second, per-uid client round trip after hydration;
 *   - `getUser` logged and fell through on any non-OK response, returning
 *     `undefined`. A 401 was therefore indistinguishable from "no such user",
 *     and the panel's `if (user)` dropped the row without its `catch` ever
 *     firing. Nothing on screen, nothing in the error path.
 *
 * The backend was never at fault — every `GET /api/v2/users/{uid}` for the
 * entry's owners answers 200 — so resolving moved to the page's server load
 * (resolveOwnerCreator, called from +page.server.ts) on the same request that
 * already fetches the entry with the visitor's cookie. This component is now
 * presentational, and these tests are about what the reader sees for a given
 * set of rows. No module mocking: there is nothing left to mock, which is the
 * point.
 */

/**
 * A resolved row, as the load hands it over.
 *
 * Typed as the real thing rather than an inferred object literal: an earlier
 * fixture here said `formatted_name`, borrowed from the contact payloads, and
 * every row then rendered the "—" placeholder while the email and role badge
 * beside it were right. A fixture that half-matches the real shape fails in a
 * way that looks like a component bug, so the annotation is what keeps this
 * honest.
 */
const row = (
	uid: string,
	name: string,
	roles: { isOwner: boolean; isCreator: boolean }
): UserWithRoles => ({
	uid,
	name,
	email: `${uid}@example.org`,
	createdAt: null,
	accounts: [],
	access: [{ uid: 'a-1', role: 'staff', createdAt: null, active: true }],
	...roles
});

const ALICE_OWNER = row('u-alice', 'Alice Martin', { isOwner: true, isCreator: false });
const BRUNO_CREATOR = row('u-bruno', 'Bruno Petit', { isOwner: false, isCreator: true });
const ALICE_BOTH = row('u-alice', 'Alice Martin', { isOwner: true, isCreator: true });

describe('the owner / creator panel', () => {
	it('names the owner of an entry', async () => {
		// The bug, at its simplest: an entry with one owner showed none.
		render(CreatorOwner, { owner: ['u-alice'], creator: [], users: [ALICE_OWNER] });
		await expect.element(page.getByText('Alice Martin')).toBeVisible();
	});

	it('names an owner and a creator who are different people', async () => {
		render(CreatorOwner, {
			owner: ['u-alice'],
			creator: ['u-bruno'],
			users: [ALICE_OWNER, BRUNO_CREATOR]
		});
		await expect.element(page.getByText('Alice Martin')).toBeVisible();
		await expect.element(page.getByText('Bruno Petit')).toBeVisible();
	});

	it('shows somebody who is both, once', async () => {
		// The union is computed upstream, so a row per capacity would double the
		// common case rather than marking one row twice.
		render(CreatorOwner, { owner: ['u-alice'], creator: ['u-alice'], users: [ALICE_BOTH] });
		await expect.element(page.getByText('Alice Martin')).toBeVisible();
		expect(page.getByText('Alice Martin').elements()).toHaveLength(1);
	});

	it('adds a row when a user starts being named', async () => {
		// What broke. Adding an owner re-runs the load and hands this panel new
		// rows; a panel that had copied the old answer into state kept showing
		// it — which is exactly "not even after a reload".
		const { rerender } = await render(CreatorOwner, {
			owner: ['u-alice'],
			creator: [],
			users: [ALICE_OWNER]
		});
		await expect.element(page.getByText('Alice Martin')).toBeVisible();

		await rerender({
			owner: ['u-alice', 'u-bruno'],
			creator: [],
			users: [ALICE_OWNER, BRUNO_CREATOR]
		});

		await expect.element(page.getByText('Bruno Petit')).toBeVisible();
	});

	it('drops a row when the user stops being named', async () => {
		const { rerender } = await render(CreatorOwner, {
			owner: ['u-alice', 'u-bruno'],
			creator: [],
			users: [ALICE_OWNER, BRUNO_CREATOR]
		});
		await expect.element(page.getByText('Bruno Petit')).toBeVisible();

		await rerender({ owner: ['u-alice'], creator: [], users: [ALICE_OWNER] });

		await expect.element(page.getByText('Alice Martin')).toBeVisible();
		await expect.element(page.getByText('Bruno Petit')).not.toBeInTheDocument();
	});

	it('says so when an entry names nobody', async () => {
		// The empty message is correct *here* — the bug was showing it while an
		// owner existed, so this pins the case it is actually for. It can no
		// longer stand in for a failed lookup: those throw in the load and reach
		// the page's error boundary instead.
		render(CreatorOwner, { owner: null, creator: null, users: [] });
		await expect.element(page.getByText('Aucun utilisateur associé.')).toBeVisible();
	});

	it('warns that an entry has no owner even while a creator is listed', async () => {
		// `owner` is kept as its own prop precisely for this: the warning asks
		// "does this entry have an owner at all", which the rows cannot answer
		// when the only person named is a creator.
		render(CreatorOwner, { owner: null, creator: ['u-bruno'], users: [BRUNO_CREATOR] });
		await expect.element(page.getByText("Cette entrée n'a pas de propriétaire.")).toBeVisible();
		await expect.element(page.getByText('Bruno Petit')).toBeVisible();
	});

	it('says a named owner could not be loaded rather than showing a short list', async () => {
		// The load skips a uid whose lookup 404s, so `users` can be shorter than
		// what the entry names. Counting rows would then report "no owner" for an
		// entry that has one — the same mistake as the original bug, where an
		// empty list was rendered as if it meant nobody.
		render(CreatorOwner, { owner: ['u-alice', 'u-gone'], creator: [], users: [ALICE_OWNER] });

		await expect.element(page.getByText('Alice Martin')).toBeVisible();
		await expect
			.element(page.getByText('Impossible de charger les utilisateurs associés.'))
			.toBeVisible();
	});

	it('says the same for a creator nobody could resolve', async () => {
		// Why `creator` is still a prop. Without it an unresolvable creator is
		// invisible: no row, no warning, and nothing to tell the reader that the
		// entry credits somebody the panel could not show.
		render(CreatorOwner, { owner: ['u-alice'], creator: ['u-gone'], users: [ALICE_OWNER] });

		await expect
			.element(page.getByText('Impossible de charger les utilisateurs associés.'))
			.toBeVisible();
	});

	it('stays quiet when every named uid produced a row', async () => {
		// The warning must not fire on the ordinary case.
		render(CreatorOwner, {
			owner: ['u-alice'],
			creator: ['u-bruno'],
			users: [ALICE_OWNER, BRUNO_CREATOR]
		});

		await expect.element(page.getByText('Alice Martin')).toBeVisible();
		await expect
			.element(page.getByText('Impossible de charger les utilisateurs associés.'))
			.not.toBeInTheDocument();
	});

	it('renders its rows without waiting, so they survive server rendering', async () => {
		// The move's whole purpose. The old panel rendered "Chargement..." into
		// the SSR'd html and never got further on the server; nothing may await
		// now, so the name is present on the first paint.
		render(CreatorOwner, { owner: ['u-alice'], creator: [], users: [ALICE_OWNER] });
		await expect.element(page.getByText('Chargement...')).not.toBeInTheDocument();
		await expect.element(page.getByText('Alice Martin')).toBeVisible();
	});
});
