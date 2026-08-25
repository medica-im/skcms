/** The shapes the clone endpoints return, and the decisions made from them. */

export type Match = {
	kind: 'exact' | 'warn';
	reason: string;
	local_uid: string;
	differing_fields: string[];
};

export type ObjectPlan = {
	matches: Match[];
	default_resolution: 'reuse' | 'create';
	auto: boolean;
	local_uid?: string | null;
};

export type Blocker = { reason: string; detail: string; local_slug?: string | null };

export type Preflight = {
	source_uid: string;
	name: string;
	effector: ObjectPlan;
	facility: ObjectPlan;
	blockers: Blocker[];
	warnings: string[];
	auto_clonable: boolean;
};

/**
 * Which entries clone silently, and which need a person to look.
 *
 * The split is the whole UX rule: asking about an entry with nothing to decide
 * trains people to click through the ones that do matter. Blocked entries are
 * neither — they cannot be cloned at all, so they are listed separately rather
 * than queued for a decision nobody can make.
 */
export function partition(plans: Preflight[]) {
	const blocked = plans.filter((p) => p.blockers.length > 0);
	const rest = plans.filter((p) => p.blockers.length === 0);
	return {
		auto: rest.filter((p) => p.auto_clonable),
		prompted: rest.filter((p) => !p.auto_clonable),
		blocked
	};
}

/** Whether anything at all can be cloned from this preflight. */
export function anythingToDo(plans: Preflight[]): boolean {
	return plans.some((p) => p.blockers.length === 0);
}
