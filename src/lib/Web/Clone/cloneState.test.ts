import { describe, it, expect } from 'vitest';
import { partition, anythingToDo, type Preflight } from './cloneState';

/**
 * Which cloned entries stop for a human, and which do not.
 *
 * The split is the UX rule the whole wizard rests on: prompting about an entry
 * with nothing to decide is how people learn to click through the ones that
 * matter.
 */

const plan = (over: Partial<Preflight> = {}): Preflight => ({
	source_uid: 'u',
	name: 'Someone',
	effector: { matches: [], default_resolution: 'create', auto: true },
	facility: { matches: [], default_resolution: 'create', auto: true },
	blockers: [],
	warnings: [],
	auto_clonable: true,
	...over
});

describe('partition', () => {
	it('lets a clean entry through without asking', () => {
		const { auto, prompted } = partition([plan()]);
		expect(auto).toHaveLength(1);
		expect(prompted).toHaveLength(0);
	});

	it('stops on an entry whose facility needs a decision', () => {
		const { auto, prompted } = partition([plan({ auto_clonable: false })]);
		expect(auto).toHaveLength(0);
		expect(prompted).toHaveLength(1);
	});

	it('keeps blocked entries out of the queue', () => {
		// A blocker is not a decision anybody can make, so queueing it would ask
		// a question with no answer.
		const { auto, prompted, blocked } = partition([
			plan({ blockers: [{ reason: 'entry_exists', detail: 'already here' }], auto_clonable: false })
		]);
		expect(blocked).toHaveLength(1);
		expect(auto).toHaveLength(0);
		expect(prompted).toHaveLength(0);
	});

	it('separates all three kinds in one batch', () => {
		const { auto, prompted, blocked } = partition([
			plan({ source_uid: 'a' }),
			plan({ source_uid: 'b', auto_clonable: false }),
			plan({ source_uid: 'c', blockers: [{ reason: 'commune', detail: 'no commune' }] })
		]);
		expect(auto.map((p) => p.source_uid)).toEqual(['a']);
		expect(prompted.map((p) => p.source_uid)).toEqual(['b']);
		expect(blocked.map((p) => p.source_uid)).toEqual(['c']);
	});
});

describe('anythingToDo', () => {
	it('is false when every entry is blocked', () => {
		expect(anythingToDo([plan({ blockers: [{ reason: 'x', detail: 'y' }] })])).toBe(false);
	});

	it('is true when at least one can be cloned', () => {
		expect(anythingToDo([plan({ blockers: [{ reason: 'x', detail: 'y' }] }), plan()])).toBe(true);
	});
});
