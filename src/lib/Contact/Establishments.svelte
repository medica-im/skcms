<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faBuildingUser, faLink } from '@fortawesome/free-solid-svg-icons';
	import { spansCommunes } from '#lib/components/Directory/sites.ts';
	import { entrySlugPageUrl, facilityPageUrl } from '#lib/utils/utils.ts';
	import type { Facility } from '#lib/interfaces/facility.interface.ts';
	import type { Entry } from '#lib/store/directoryStoreInterface.ts';

	/** Where the members practise: a pointer to each facility's page, which holds the rest. */
	let { places }: { places: { facility: Facility; secretariat: Entry | undefined }[] } = $props();

	const withCommune = $derived(spansCommunes(places.map((p) => p.facility)));

	const named = (facility: Facility) => {
		const city = facility.address?.city;
		return withCommune && city && !facility.name.includes(city)
			? `${facility.name}, ${city}`
			: facility.name;
	};
</script>

{#if places.length}
	<section data-testid="establishments" class="space-y-2">
		<h2 class="h2">{m.OUR_FACILITIES({ count: places.length })}</h2>
		<ul class="lg:columns-2 lg:gap-x-12">
			{#each places as { facility, secretariat } (facility.uid)}
				<li
					class="mb-2 flex flex-wrap items-center gap-x-6 break-inside-avoid rounded-container-token bg-surface-50/40 px-4 py-1 dark:bg-surface-900/20"
				>
					<a
						class="inline-flex min-h-[44px] items-center py-1 text-base font-semibold hover:underline hover:underline-offset-4"
						href={facilityPageUrl(facility)}
					>
						{named(facility)}<Fa class="ml-2 opacity-60" size="sm" icon={faLink} />
					</a>
					{#if secretariat}
						<a
							class="inline-flex min-h-[44px] items-center gap-2 text-base text-primary-800-100-token hover:underline hover:underline-offset-4"
							href={entrySlugPageUrl(secretariat)}
						>
							<Fa icon={faBuildingUser} />Secrétariat
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}
