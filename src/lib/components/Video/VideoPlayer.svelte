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

				// A label, not an icon. A video.js button draws its glyph from an
				// icon class, and this one has no glyph of its own — without
				// something to paint it collapsed to 0x0 and could not be clicked
				// at all, however correct the menu behind it was.
				//
				// The label doubles as the readout: it says which rendition is
				// playing, which "Auto" alone would not.
				this.label = document.createElement('span');
				this.label.className = 'vjs-quality-label';
				this.label.textContent = 'Auto';
				this.el().insertBefore(this.label, this.menu.el());
			}

			/** Called whenever the player settles on a rendition. */
			setLabel(text: string) {
				if (this.label) this.label.textContent = text;
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
						this.setLabel(label);
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
		const bar = p.getChild('controlBar');
		const button = bar?.addChild('QualityButton', {}, bar.children().length - 1);

		// On Auto the label follows what the player chose, so a reader can see
		// the stream step down on a weak connection rather than guess at it.
		levels.on('change', () => {
			const selected = button?.items?.find((i: any) => i.isSelected_);
			if (selected && selected.options_.label !== 'Auto') return;
			const current = levels[levels.selectedIndex];
			if (current) button?.setLabel(`Auto (${current.height}p)`);
		});
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

<!--
	:global because these elements are video.js's, created after mount, so
	Svelte's scoping never reaches them.

	Deliberately not themed light/dark: the control bar sits ON the video, where
	the background is the footage rather than the page. White on the player's own
	translucent black reads the same in both modes, and following the page theme
	would put light-grey text over a bright frame in light mode.
-->
<style lang="postcss">
	/* The label is the button's only visible content — without a width it
	   collapses to 0x0 and cannot be clicked. */
	:global(.video-js .vjs-quality-selector) {
		width: auto !important;
		min-width: 4rem;
		padding: 0 0.5rem;
	}

	:global(.video-js .vjs-quality-label) {
		display: inline-block;
		line-height: 3em;
		font-size: 1em;
		color: #fff;
		white-space: nowrap;
	}

	/*
		Every rule below is prefixed .video-js and marked !important, because
		video.js's own stylesheet is more specific than a plain class and wins
		otherwise: its defaults paint the menu #2B333F text on a 35%-white panel,
		which over pale footage came out dark-grey on near-white and was
		effectively unreadable — the selected item worst of all, white on white.

		Solid dark panel, white text. Not themed to the page: the menu sits ON the
		video, where the backdrop is the footage rather than the page background,
		so following the page theme would put pale text over a bright frame in
		light mode. This reads the same either way.
	*/
	:global(.video-js .vjs-quality-selector .vjs-menu-content) {
		background-color: rgb(15 17 21 / 0.95) !important;
		border-radius: 0.25rem;
		overflow: hidden;
	}

	:global(.video-js .vjs-quality-selector .vjs-menu-item) {
		color: #fff !important;
		background-color: transparent !important;
		font-size: 1em;
		padding: 0.6em 1.2em;
		text-transform: none;
	}

	:global(.video-js .vjs-quality-selector .vjs-menu-item:hover),
	:global(.video-js .vjs-quality-selector .vjs-menu-item:focus) {
		background-color: rgb(255 255 255 / 0.2) !important;
		color: #fff !important;
	}

	/* The current choice. Video.js marks it only with a faint tint, which is
	   not enough to find at a glance. */
	:global(.video-js .vjs-quality-selector .vjs-menu-item.vjs-selected) {
		background-color: rgb(255 255 255 / 0.16) !important;
		color: #fff !important;
		font-weight: 700;
	}

	/* Its screen-reader suffix ("Auto, selected") must not print on screen. */
	:global(.video-js .vjs-quality-selector .vjs-menu-item .vjs-control-text) {
		position: absolute !important;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
</style>
