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
	<nav aria-label="Fil d'Ariane">
		<ol class="breadcrumb">
			{#each trail as crumb, i}
				{#if i > 0}
					<li class="crumb-separator" aria-hidden="true">/</li>
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
