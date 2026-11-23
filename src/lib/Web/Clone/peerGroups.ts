export type Peer = { name: string; display_name: string; origin: string };
export type Environment = 'production' | 'staging' | 'development' | 'other';
export type PeerGroup = { environment: Environment; peers: (Peer & { label: string })[] };

const ORDER: Environment[] = ['production', 'staging', 'development', 'other'];

const SUFFIXES: Record<string, Environment> = {
	'-prod': 'production',
	'-staging': 'staging',
	'-dev': 'development'
};

const environmentOf = (name: string): Environment =>
	Object.entries(SUFFIXES).find(([suffix]) => name.endsWith(suffix))?.[1] ?? 'other';

/** The display name without its trailing "(production)" or "(staging)": the group says it. */
const labelOf = (peer: Peer, environment: Environment) =>
	environment === 'other' ? peer.display_name : peer.display_name.replace(/\s*\([^)]*\)\s*$/, '');

export function groupPeers(peers: Peer[]): PeerGroup[] {
	return ORDER.map((environment) => ({
		environment,
		peers: peers
			.filter((p) => environmentOf(p.name) === environment)
			.map((p) => ({ ...p, label: labelOf(p, environment) }))
	})).filter((g) => g.peers.length > 0);
}
