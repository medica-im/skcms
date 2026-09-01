<script lang="ts">
	import * as m from '$msgs';
	import { page } from '$app/state';
	import DocsIcon from '$lib/Icon/Icon.svelte';
	import { menuNavCats } from '$var/variables.ts';
	import { AppRail, AppRailTile } from '@skeletonlabs/skeleton';
	import { variables } from '$lib/utils/constants';
	import MenuNavLinks from './MenuNavLinks.svelte';

	let currentRailCategory: string | undefined = $derived(
		menuNavCats.find((cat) =>
			cat.list.some((navItem: any) =>
				navItem.href === page.url.pathname + page.url.search ||
				navItem.list.some((link: any) => link.href === page.url.pathname + page.url.search)
			)
		)?.id
	);

	let navLinks = $derived(
		menuNavCats.find((cat) => cat.id === currentRailCategory)?.list
	);

	let classesActive = $derived((href: string) => {
		return page.url.pathname + page.url.search === href ? 'variant-ringed-primary' : '';
	});
</script>

<!--
	navLinks?.length, not navLinks: an empty array is truthy, so a category that
	lists nothing would still draw the sidebar and hold open its 1fr column.
	The same rule the mobile drawer follows — the second column exists only when
	there is a second thing to put in it.
-->
{#if navLinks?.length}
	<div class="hidden lg:block h-full">
		<div
			class="grid grid-cols-[auto_1fr] h-full bg-surface-50-900-token border-r border-surface-500/30"
		>
			<!-- App Rail -->
			<AppRail background="!bg-transparent" border="border-r border-surface-500/30">
				{#each menuNavCats as navCat}
					<AppRailTile bind:group={currentRailCategory} name={navCat.id} value={navCat.id}>
						<svelte:fragment slot="lead">
							<DocsIcon name={navCat.docsIcon} width="w-6" height="h-6" />
						</svelte:fragment>
						<span>{navCat.title[variables.DEFAULT_LANGUAGE]}</span>
					</AppRailTile>
				{/each}
			</AppRail>
			<!-- Nav Links -->
			<section class="p-4 pb-20 space-y-4 overflow-y-auto w-[360px]">
				{#each navLinks as { id, title, href, list }, i}
					{#if list.filter((e) => e.active != false).length > 0}
						<!--
							Title: a link to the category's landing page, when it has one.

							Without an href this is a heading over pages that explain
							themselves, so it is plain text — not a link, and not underlined
							on hover, which would promise somewhere to go. The same rule as
							the mobile drawer.
						-->
						<div {id} class="text-primary-700 dark:text-primary-500 font-bold uppercase px-4">
							{#if href}
								<a {href} class="hover:underline" data-sveltekit-preload-data="hover">
									{title[variables.DEFAULT_LANGUAGE]}
								</a>
							{:else}
								{title[variables.DEFAULT_LANGUAGE]}
							{/if}
						</div>
						<!-- Navigation List -->
						<nav class="list-nav">
							<ul>
								{#each list.filter((e) => e.active != false) as { href, label, badge }}
									<li>
										<a {href} class={classesActive(href)} data-sveltekit-preload-data="hover">
											<span class="flex-auto">{@html label}</span>
											{#if badge}<span class="badge variant-filled-secondary">{badge}</span>{/if}
										</a>
									</li>
								{/each}
							</ul>
						</nav>
					{/if}
				{/each}
			</section>
		</div>
	</div>
{/if}
