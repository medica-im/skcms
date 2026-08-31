<script lang="ts">
	import videojs from 'video.js';
	import 'video.js/dist/video-js.min.css';
	import 'videojs-contrib-quality-levels';
	import { onDestroy, onMount } from 'svelte';
	import type Player from 'video.js/dist/types/player';
	import { enabledFor, menuLabels } from './qualityMenu';

	interface Video {
		src: string;
		type: string;
	}

	/**
	 * Either an HLS playlist or a list of plain MP4s.
	 *
	 * `src` is the HLS path and the one to prefer: one playlist over segmented
	 * renditions, so the player measures the connection, switches quality
	 * mid-play, and starts on the first segment rather than waiting for a whole
	 * file.
	 *
	 * `data` is the fallback for footage too compressed to ladder — video.js
	 * plays the first source its tech can play and never looks at the rest, so
	 * that list is one fixed quality with no way to change it. Kept because a
	 * 156 kbps master gains nothing from being segmented.
	 */
	export let src: string | undefined = undefined;
	export let data: Video[] | undefined = undefined;

	let player: Player;
	let el: HTMLVideoElement;

	/**
	 * A quality menu built from the playlist's own renditions.
	 *
	 * Written here rather than taken from videojs-hls-quality-selector: that
	 * package resolves to a CJS entry expecting a global `videojs`, which does
	 * not exist once the app is bundled as ESM, so its registerPlugin call never
	 * reaches our instance and the button never appears.
	 *
	 * "Auto" is the default and stays selected until a reader chooses a height:
	 * enabling every level lets the player pick on bandwidth, and enabling only
	 * one pins it there.
	 */
	function addQualityMenu(p: any) {
		const levels = p.qualityLevels?.();
		if (!levels || levels.length < 2) return;

		const MenuButton = videojs.getComponent('MenuButton') as any;
		const MenuItem = videojs.getComponent('MenuItem') as any;

		const heights: number[] = Array.from(
			{ length: levels.length },
			(_, i) => levels[i].height as number
		);
		const labels = menuLabels(heights);

		class QualityButton extends MenuButton {
			constructor(player: any, options: any) {
				super(player, options);
				this.controlText('Qualité');
				this.addClass('vjs-quality-selector');
			}
			createItems() {
				const make = (label: string, height: number | null) => {
					const item = new MenuItem(p, { label, selectable: true, selected: height === null });
					item.handleClick = () => {
						this.items.forEach((o: any) => o.selected(false));
						item.selected(true);
						// enabledFor is the tested rule; see qualityMenu.test.ts.
						enabledFor(heights, height).forEach((on, i) => {
							levels[i].enabled = on;
						});
					};
					return item;
				};
				return labels.map((label) =>
					make(label, label === 'Auto' ? null : parseInt(label, 10))
				);
			}
		}

		videojs.registerComponent('QualityButton', QualityButton);
		// Before the fullscreen button, where a viewer expects to find it.
		p.getChild('controlBar')?.addChild('QualityButton', {}, 
			p.getChild('controlBar')?.children().length - 1);
	}

	onMount(() => {
		// The element, not an id. This component used to call videojs('player')
		// against a hardcoded id, so a second player on the same page would
		// initialise against the first one's element.
		player = videojs(el, {
			fluid: true,
			preload: 'auto',
			...(src ? { sources: [{ src, type: 'application/x-mpegURL' }] } : { sources: data ?? [] })
		});

		// Only for HLS: the menu lists the renditions in the playlist, and a list
		// of separate MP4s has none. The levels arrive with the manifest, so this
		// waits for it rather than reading an empty list on mount.
		if (src) player.on('loadedmetadata', () => addQualityMenu(player));
	});

	onDestroy(() => {
		if (player) player.dispose();
	});
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<video bind:this={el} class="video-js" controls preload="auto">
	<track kind="captions" />
</video>
