/**
 * Which renditions stay enabled when a viewer picks a quality.
 *
 * Extracted from the menu so the rule can be tested: reaching the live player
 * from a browser test is not possible here — video.js is bundled as a module,
 * so there is no global `videojs` to look it up through, and the control bar
 * hides itself whenever the pointer leaves the player.
 *
 * `null` is Auto: every level enabled, so the player chooses on bandwidth.
 * A height pins playback there by enabling only the levels of that height.
 */
export const enabledFor = (heights: number[], chosen: number | null): boolean[] =>
	heights.map((h) => chosen === null || h === chosen);

/** The menu's labels, highest first, with Auto at the top. */
export const menuLabels = (heights: number[]): string[] => [
	'Auto',
	...[...new Set(heights)].sort((a, b) => b - a).map((h) => `${h}p`)
];
