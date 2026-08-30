<script lang="ts">
	import { page } from '$app/state';
	import { variables } from '$src/lib/utils/constants';
	import Fa from 'svelte-fa';
	import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
	import { getProgram } from '$lib/links.ts';
	import { programsCopy } from './copy.ts';
	import type { ProgramsNavLinks } from '$lib/interfaces/variables.interface.ts';

	export let programsNavLinks: ProgramsNavLinks;
	// Pass "" to drop the paragraph under the heading; leave it out to keep the
	// wording that goes with the organization's category.
	export let lead: string | undefined = undefined;

	const copy = programsCopy(
		page.data.organization?.category?.name,
		page.data.organization.formatted_name_definite_article,
		lead
	);

	// Tailwind only generates classes it can read in the source, so the column
	// count cannot be interpolated into the class name.
	const columns: Record<number, string> = {
		1: 'lg:grid-cols-1',
		2: 'lg:grid-cols-2',
		3: 'lg:grid-cols-3',
		4: 'lg:grid-cols-4'
	};
	$: categoryCount = Object.keys(programsNavLinks).length;
	$: gridColumns = columns[categoryCount] ?? 'lg:grid-cols-4';
</script>

<div class="space-y-4 md:space-y-10">
	<!-- Info -->
	<!-- space-y only when there is a second child: an empty <p> would still
	     take the gap below the heading and leave the section top-heavy. -->
	<div class="text-center {copy.lead ? 'space-y-4' : ''}">
		<h2 class="h2">{copy.title}</h2>
		{#if copy.lead}
			<p>{copy.lead}</p>
		{/if}
	</div>
	<!-- Grid -->
	<!--
		justify-items-stretch, not -center: centred, each card shrank to the width
		of its own title, so the three sat at three different widths with ragged
		edges — most visible stacked in one column on a phone, where "Prévention
		en santé" was 231px against "Parcours pluriprofessionnels" at 300px.
	-->
	<div class="grid grid-cols-1 {gridColumns} gap-4 align-top justify-items-stretch">
		<!-- Loop -->
		{#each Object.values(programsNavLinks) as progCat}
			{@const program = getProgram(progCat.href, programsNavLinks)}
			<!-- Card -->
			<div class="card variant-glass p-4 shadow-lg md:p-10 space-y-4 text-center">
				<div>
                    <a href={progCat.href} title="{progCat.title[variables.DEFAULT_LANGUAGE as keyof object]}" class="btn-icon btn-icon-xl variant-soft-primary">
						<Fa icon={progCat.icon} />
                    </a>
            </div>
            <div>
				<a href={progCat.href} class="btn bg-initial hover:variant-soft-primary"><h3 class="flex flex-wrap whitespace-normal text-left">{progCat.title[variables.DEFAULT_LANGUAGE as keyof object]}</h3></a>
            </div>
            <div>
				<ul class="list text-left">
					{#each program.list as prog}
						<li>
							<a href={prog.href} class="btn bg-initial hover:variant-soft-primary">
                                <span class="badge variant-filled-primary"><Fa icon={faArrowRight} /></span>
								
								<span class="flex flex-wrap whitespace-normal text-left">{prog.label}</span>
							</a>
						</li>
					{/each}
				</ul>
            </div>
			</div>
		{/each}
	</div>
</div>
