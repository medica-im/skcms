<script lang="ts">
	import * as m from '$msgs';

	/** Why a profession's person is asked for a gender, under the select. */
	let {
		words,
		gender
	}: {
		/** The profession's word for a woman and for a man; null when unknown. */
		words: { F: string; M: string } | null;
		gender: string | null | undefined;
	} = $props();

	const same = $derived(!!words && words.F === words.M);
	const shown = $derived(words && !same && (gender === 'F' || gender === 'M') ? words[gender] : null);
</script>

{#if shown}
	<p class="text-sm font-semibold">{m.EFFECTOR_GENDER_SHOWN({ label: shown })}</p>
{:else}
	<p class="text-sm opacity-75">
		{#if !words}
			{m.EFFECTOR_GENDER_WHY_GENERIC()}
		{:else if same}
			{m.EFFECTOR_GENDER_WHY_SAME({ word: words.F })}
		{:else}
			{m.EFFECTOR_GENDER_WHY({ feminine: words.F, masculine: words.M })}
		{/if}
	</p>
{/if}
