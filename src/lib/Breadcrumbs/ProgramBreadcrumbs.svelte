<script lang="ts">
	import { page } from '$app/state';
	import { programTrail } from './trail.ts';
	import type { ProgramsNavLinks } from '$lib/interfaces/variables.interface.ts';

	let { programsNavLinks }: { programsNavLinks: ProgramsNavLinks } = $props();

	// $derived, not `$:`. `page` from $app/state is a rune-backed object, and a
	// component using `export let` compiles in legacy mode where that is read
	// once and never again — the trail then kept whatever page it was first
	// mounted on, so navigating from one category to another left the previous
	// category's crumbs in place.
	const trail = $derived(programTrail(page.url.pathname, programsNavLinks));
</script>

<!--
	Only worth drawing once there is somewhere to go back to: on a page outside
	the programmes the trail is just "Accueil", which says nothing a reader
	cannot already see.
-->
{#if trail.length > 1}
	<!--
		The trail reads as one sentence that happens to run onto a second line.

		Skeleton's .breadcrumb is a flex row with no flex-wrap, so the crumbs
		cannot move down — each is squeezed below its own text width instead and
		the label wraps inside that narrow box. A long trail came out as a stack
		of columns: a name wrapped onto itself, a "/", then the next name wrapped
		onto itself.

		Rather than a flex row of rigid boxes this is laid out as text: the list
		is a block, the crumbs are inline, and a long trail breaks between words
		like a sentence would. Breaking mid-label keeps the line full, so
		"Accueil / Accès aux soins / Soins non" fits on the first line and only
		"programmés" runs on — where making each crumb rigid would drop the whole
		of a 175px name onto a line of its own.

		Skeleton hides all but the last three items (.breadcrumb li nth-last-child)
		to keep its single row short. With the trail wrapping there is room for
		all of it, and dropping "Accueil" is the one crumb a reader most wants —
		so every item is shown again.
	-->
	<nav aria-label="Fil d'Ariane">
		<ol class="breadcrumb block space-x-0 [&>li]:!inline">
			{#each trail as crumb, i}
				{#if i > 0}
					<li class="crumb-separator mx-2" aria-hidden="true">/</li>
				{/if}
				<li class="crumb">
					{#if crumb.current}
						<!--
							The page you are on: named, but not a link to itself. Keyed on
							the crumb rather than its position — the last crumb is not
							always the current page. On a sub-page the trail ends at the
							programme above it, which has to stay clickable.
						-->
						<span aria-current="page">{crumb.label}</span>
					{:else}
						<a class="anchor" href={crumb.href} data-sveltekit-preload-data="hover"
							>{crumb.label}</a
						>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>
{/if}
