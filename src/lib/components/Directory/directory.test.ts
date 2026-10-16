import { describe, it, expect } from 'vitest';
import { getAvatars } from './directory';
import type { Entry } from '$lib/store/directoryStoreInterface';

const ORG = 'org-msp';

const entry = (uid: string, memberships: string[], active = true, avatar: object | null = { sm: `/${uid}.jpg` }) =>
	({ uid, memberships, active, avatar }) as unknown as Entry;

describe('getAvatars: the team gallery on a home page', () => {
	it('shows the members of the organization who have a photo', () => {
		const entries = [entry('member', [ORG]), entry('outsider', ['another-org']), entry('no-photo', [ORG], true, null)];

		expect(getAvatars(entries, ORG).map((e) => e.uid)).toEqual(['member']);
	});

	it('leaves out an inactive entry, even one still a member with a photo', () => {
		const entries = [entry('inactive-coordinator', [ORG], false), entry('active-member', [ORG])];

		expect(getAvatars(entries, ORG).map((e) => e.uid)).toEqual(['active-member']);
	});
});
