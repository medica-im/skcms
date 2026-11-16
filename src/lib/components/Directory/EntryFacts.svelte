<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faDoorOpen, faUserGroup } from '@fortawesome/free-solid-svg-icons';
	import { FACET_LABELS } from './facetLabels';
	import { ageRange } from '$lib/store/ageRange.ts';
	import type { EntryFull } from '$lib/store/directoryStoreInterface.ts';

	/** Who the entry is for, and how to get in; nothing shows for what the entry does not say. */
	let { entry }: { entry: Pick<EntryFull, 'age_min' | 'age_max' | 'who_can_contact' | 'access_modes' | 'audiences' | 'free' | 'anonymous_care'> } = $props();

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

	const known = (facts: (string | null)[]) => facts.filter((fact): fact is string => fact !== null);

	const sections = $derived(
		[
			{
				id: 'entry-public',
				title: m.DIRECTORY_ENTRY_PUBLIC(),
				icon: faUserGroup,
				facts: known([ageText, ...(entry.audiences ?? []).map((value) => FACET_LABELS.audiences[value]())])
			},
			{
				id: 'entry-access',
				title: m.DIRECTORY_ENTRY_ACCESS(),
				icon: faDoorOpen,
				facts: known([
					entry.who_can_contact ? FACET_LABELS.access[entry.who_can_contact]() : null,
					...(entry.access_modes ?? []).map((value) => FACET_LABELS.accessModes[value]()),
					entry.free ? m.DIRECTORY_FACET_FREE() : null,
					entry.anonymous_care ? m.DIRECTORY_FACET_ANONYMOUS() : null
				])
			}
		].filter((section) => section.facts.length)
	);
</script>

{#each sections as section (section.id)}
	<section aria-labelledby={section.id}>
		<div class="flex items-center py-2">
			<div class="w-9"><Fa icon={section.icon} size="sm" /></div>
			<h4 class="h4" id={section.id}>{section.title}</h4>
		</div>
		<div class="flex">
			<div class="w-9 flex-none"></div>
			<ul class="flex flex-wrap gap-2 py-2">
				{#each section.facts as fact (fact)}
					<li class="rounded-token variant-ringed-surface text-surface-900-50-token px-3 py-1 text-base">{fact}</li>
				{/each}
			</ul>
		</div>
	</section>
{/each}
