<script lang="ts">
	import * as m from '$msgs';
	import { popup } from '@skeletonlabs/skeleton';
	import type { PopupSettings } from '@skeletonlabs/skeleton';
	import { resolve } from './lexicon.ts';
	import Fa from 'svelte-fa';
	import {
		faCircleQuestion
	} from '@fortawesome/free-regular-svg-icons';
	import { removeSpaces } from '$lib/helpers/stringHelpers';
	import { base } from '$app/paths';
	let { w }: { w: string } = $props();

	const randString = Math.random().toString(36).substring(2);

	// Announced by aria-expanded, so a screen reader says whether the definition
	// is showing. Skeleton tracks this internally to position the card; without
	// mirroring it here the state exists visually and nowhere else.
	let open = $state(false);

	function pop() {
		let settings: PopupSettings = {
			// Set the event as: click | hover | hover-click
			event: 'click',
			// Provide a matching 'data-popup' value.
			target: randString,
			state: (e: { state: boolean }) => (open = e.state)
		};
		return settings;
	}
	// The term carrying the text, and the text itself. `w` may be a synonym —
	// "MSP" — in which case both come from the term it points at, while the
	// abbreviation stays what the reader is shown.
	const entry = $derived(resolve(w));
</script>

<!--
	A button rather than an abbr with a title: the definition has to be reachable
	by keyboard and by touch, and a title attribute is neither. The "?" is
	aria-hidden because it is decoration — the accessible name below already says
	what the control does.

	The name is not just the term. A trigger named "MSP" is announced "MSP,
	button" and is indistinguishable from the word in the prose beside it, so the
	name says what pressing it gets you. aria-expanded reports whether it is
	showing, and aria-controls ties it to the card, which is otherwise an
	orphaned region of the page.
-->
<button
	class="btn p-0 m-0"
	use:popup={pop()}
	aria-expanded={open}
	aria-controls={randString}
	aria-label={entry ? `${w}, ${m.SEE_DEFINITION()}` : w}
	><span class="p-0 m-0">{w}</span><span class="p-0 m-0 opacity-50" aria-hidden="true"
		><Fa icon={faCircleQuestion} /></span
	></button
>
<!--
	Hidden until Skeleton opens it. The popup action only ever sets
	`display: block` — it never hides the card to begin with — so the definition
	was laid out in the server-rendered HTML and stayed on screen until
	hydration ran and the action took it over. That is the flash of a definition
	sitting in the middle of the prose for as long as the JavaScript takes to
	arrive, on a page whose whole point is to be readable before then.

	Scoped to this component's own class rather than [data-popup] at large: the
	navigation menus are Skeleton popups too, and hiding those by default is not
	this component's business.
-->
<div
	class="def-popup card variant-filled-secondary p-2 w-3/4 lg:w-1/3 z-10"
	data-popup={randString}
	id={randString}
	role="tooltip"
>
	{#if entry}
		<h4 class="h4">
			<!--
				A synonym shows both spellings — "MSP" and what it stands for —
				since the reader met the short one and is owed the long one. A term
				that is its own entry has nothing to expand.
			-->
			<dfn>
				{#if entry.term !== w}<abbr title={entry.term}>{w}</abbr> {entry.term}{:else}{w}{/if}
			</dfn>
			<br />
			{entry.definition[0]}
			{#if entry.definition[1]}
				<!--
					The second paragraph is not shown here: the popup is a reminder,
					and the lexique page is where the full entry lives. Its absence
					is what makes this link worth offering.
				-->
				<!--
					Underlined, not tinted: the card is variant-filled-secondary, so
					a link coloured by Skeleton's .anchor (a primary tone) has to
					carry on a filled background it was never picked against. An
					underline reads as a link on any fill, and inherits the card's
					own foreground colour, so it stays legible in both themes.
				-->
				<br /><a
					data-sveltekit-reload
					class="underline decoration-2 underline-offset-2"
					href="{base}/maison-de-sante/lexique#{removeSpaces(entry.term)}"
					>{m.LEARN_MORE()}</a
				>
			{/if}
		</h4>
	{/if}
	<div class="arrow variant-filled-secondary"></div>
</div>

<style lang="postcss">
	/*
		Closed until the popup action opens it, which it does by setting
		display:block on the element itself — an inline style, so it wins over
		this without needing !important.

		The card is only hidden, not removed: it stays in the DOM so the
		aria-controls on the trigger keeps pointing at something real, and so a
		reader who lands here without JavaScript can still reach the definition
		through the lexique page link in the prose.
	*/
	.def-popup {
		@apply hidden;
	}
</style>
