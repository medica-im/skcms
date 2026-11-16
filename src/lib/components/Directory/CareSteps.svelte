<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCheck, faRoute } from '@fortawesome/free-solid-svg-icons';
	import type { EntryFull } from '$lib/store/directoryStoreInterface.ts';

	/** Where the entry sits in the care pathway: the five steps in order, its own marked. */
	let { levels }: { levels: EntryFull['care_levels'] } = $props();

	const STEPS = [
		{ value: 'prevention', label: m.DIRECTORY_CARE_STEP_PREVENTION },
		{ value: 'primary', label: m.DIRECTORY_CARE_STEP_PRIMARY },
		{ value: 'secondary', label: m.DIRECTORY_CARE_STEP_SECONDARY },
		{ value: 'tertiary', label: m.DIRECTORY_CARE_STEP_TERTIARY },
		{ value: 'emergency', label: m.DIRECTORY_CARE_STEP_EMERGENCY }
	] as const;
</script>

{#if levels?.length}
	<section aria-labelledby="entry-care-path">
		<div class="flex items-center py-2">
			<div class="w-9"><Fa icon={faRoute} size="sm" /></div>
			<h4 class="h4" id="entry-care-path">{m.DIRECTORY_ENTRY_CARE_PATH()}</h4>
		</div>
		<div class="flex">
			<div class="w-9 flex-none"></div>
			<ol class="flex flex-wrap gap-2 py-2" aria-labelledby="entry-care-path">
				{#each STEPS as step (step.value)}
					{@const current = levels.includes(step.value)}
					<li
						data-current={String(current)}
						aria-current={current ? 'step' : undefined}
						class="rounded-token px-3 py-1 text-base flex items-center gap-1 {current
							? 'variant-filled-primary font-semibold'
							: 'variant-ringed-surface text-surface-600-300-token'}"
					>
						{#if current}<Fa icon={faCheck} size="sm" />{/if}{step.label()}
					</li>
				{/each}
			</ol>
		</div>
	</section>
{/if}
