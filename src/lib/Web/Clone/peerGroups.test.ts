/**
 * The source instances, grouped by the environment they run in.
 *
 * The registry has no environment field: the name carries it (`sante-gadagne-prod`,
 * `sante-gadagne-staging`), and the display name repeats it in brackets. With ten
 * peers in one flat list, finding the right site's production or staging took
 * reading every line.
 */
import { describe, it, expect } from 'vitest';
import { groupPeers } from './peerGroups.ts';

const peer = (name: string, display_name: string) => ({ name, display_name, origin: `https://${name}` });

describe('groupPeers', () => {
	it('puts production first, then staging, each in the registry’s order', () => {
		const groups = groupPeers([
			peer('a-staging', 'A (staging)'),
			peer('b-prod', 'B (production)'),
			peer('a-prod', 'A (production)')
		]);
		expect(groups.map((g) => g.environment)).toEqual(['production', 'staging']);
		expect(groups[0].peers.map((p) => p.name)).toEqual(['b-prod', 'a-prod']);
		expect(groups[1].peers.map((p) => p.name)).toEqual(['a-staging']);
	});

	it('puts development after staging, and a name ending in -dev there', () => {
		const groups = groupPeers([
			peer('a-dev', 'A (développement)'),
			peer('a-staging', 'A (staging)'),
			peer('a-prod', 'A (production)')
		]);
		expect(groups.map((g) => g.environment)).toEqual(['production', 'staging', 'development']);
		expect(groups[2].peers[0].label).toBe('A');
	});

	it('drops the environment from the label, the group already says it', () => {
		const [group] = groupPeers([peer('a-prod', 'Santé Gadagne (production)')]);
		expect(group.peers[0].label).toBe('Santé Gadagne');
	});

	it('keeps the whole display name of a peer it cannot place', () => {
		const groups = groupPeers([peer('sandbox', 'Sandbox (essais)')]);
		expect(groups).toEqual([
			{
				environment: 'other',
				peers: [expect.objectContaining({ name: 'sandbox', label: 'Sandbox (essais)' })]
			}
		]);
	});

	it('leaves out an environment with no peer', () => {
		const groups = groupPeers([peer('a-prod', 'A (production)')]);
		expect(groups.map((g) => g.environment)).toEqual(['production']);
	});

	it('is empty for no peer', () => {
		expect(groupPeers([])).toEqual([]);
	});
});
