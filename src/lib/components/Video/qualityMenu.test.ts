import { describe, it, expect } from 'vitest';
import { enabledFor, menuLabels } from './qualityMenu';

describe('quality menu', () => {
	it('enables every rendition on Auto, so the player picks on bandwidth', () => {
		expect(enabledFor([720, 480, 360], null)).toEqual([true, true, true]);
	});

	it('pins playback to the chosen height', () => {
		expect(enabledFor([720, 480, 360], 480)).toEqual([false, true, false]);
	});

	it('enables every rendition of that height, not just the first', () => {
		// A ladder can carry two entries of the same height at different
		// bitrates; pinning to one of them would strand the other.
		expect(enabledFor([720, 480, 480, 360], 480)).toEqual([false, true, true, false]);
	});

	it('lists Auto first, then heights largest to smallest', () => {
		expect(menuLabels([360, 720, 480])).toEqual(['Auto', '720p', '480p', '360p']);
	});

	it('does not repeat a height that appears twice in the ladder', () => {
		expect(menuLabels([480, 480, 360])).toEqual(['Auto', '480p', '360p']);
	});
});
