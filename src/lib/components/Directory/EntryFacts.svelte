<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faUserGroup } from '@fortawesome/free-solid-svg-icons';
	import { FACET_LABELS } from './facetLabels';
	import { ageRange } from '$lib/store/ageRange.ts';
	import type { EntryFull } from '$lib/store/directoryStoreInterface.ts';

	/** Who the entry is for and how to reach it; nothing shows for what the entry does not say. */
	let { entry }: { entry: Pick<EntryFull, 'age_min' | 'age_max' | 'who_can_contact' | 'access_modes' | 'care_levels' | 'audiences' | 'free' | 'anonymous_care'> } = $props();

	const age = $derived(ageRange(entry.age_min, entry.age_max));
	const ageText = $derived(
		age === null
			? null
			: age.kind === 'from'
				? m.DIRECTORY_AGE_FROM({ min: age.min })
				: age.kind === 'upTo'
					? m.DIRECTORY_AGE_UP_TO({ max: age.max })
					: m.DIRECTORY_AGE_RANGE({ min: age.min, max: age.max })
	);

	const facts = $derived(
		[
			ageText,
			entry.who_can_contact ? FACET_LABELS.access[entry.who_can_contact]() : null,
			...(entry.care_levels ?? []).map((value) => FACET_LABELS.careLevels[value]()),
			...(entry.access_modes ?? []).map((value) => FACET_LABELS.accessModes[value]()),
			...(entry.audiences ?? []).map((value) => FACET_LABELS.audiences[value]()),
			entry.free ? m.DIRECTORY_FACET_FREE() : null,
			entry.anonymous_care ? m.DIRECTORY_FACET_ANONYMOUS() : null
		].filter((fact): fact is string => fact !== null)
	);
</script>

{#if facts.length}
	<div class="d-flex justify-content-between align-items-start">
		<div class="flex items-center py-2">
			<div class="w-9"><Fa icon={faUserGroup} size="sm" /></div>
			<div>
				<h4 class="h4">{m.DIRECTORY_ENTRY_FACTS()}</h4>
			</div>
		</div>
		<div class="flex">
			<div class="w-9"></div>
			<ul class="flex flex-wrap gap-2 py-2">
				{#each facts as fact (fact)}
					<li class="rounded-token variant-soft px-3 py-1 text-base">{fact}</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
