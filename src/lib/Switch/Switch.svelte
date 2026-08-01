<script lang="ts">
	import { getEditMode } from '$lib/components/Directory/context';
	import Fa from 'svelte-fa';
	import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';

	let { icon = faPenToSquare }: { icon?: typeof faPenToSquare } = $props();

	const editMode = getEditMode();

	// The store is the single source of truth: no local mirror to fall out of
	// step with it when something else flips edit mode.
	let hint = $derived($editMode ? m.EDIT_MODE_DISABLE() : m.EDIT_MODE_ENABLE());
</script>

<!--
	The pencil carries the state on its own — filled and coloured while editing,
	greyed and outlined while reading — so nothing is printed on screen. The
	wording still exists as a tooltip and an aria-label, and role="switch" plus
	aria-checked means assistive tech hears the on/off state.

	Both states differ in shape as well as colour (filled disc vs outlined ring)
	so the distinction survives without colour vision.

	Covered by features/edit-mode-toggle.feature.
-->
<button
	type="button"
	role="switch"
	aria-checked={$editMode}
	aria-label={hint}
	title={hint}
	onclick={() => ($editMode = !$editMode)}
	class="flex h-10 w-10 items-center justify-center rounded-full shadow transition-colors
		{$editMode
			? 'variant-filled-primary'
			: 'bg-surface-100-800-token/90 text-surface-400-500-token backdrop-blur variant-ringed-surface hover:text-primary-500'}"
>
	<!--
		size="lg" rather than the default: the pencil's thin strokes render
		lighter in Firefox than in Chromium, so at 16px it reads noticeably
		smaller there. A larger glyph fills the 40px button and looks the same
		in both.
	-->
	<Fa {icon} size="lg" />
</button>
