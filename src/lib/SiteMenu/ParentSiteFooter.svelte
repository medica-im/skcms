<script lang="ts">
	/**
	 * The footer for a directory embedded in a parent site.
	 *
	 * Mirrors the parent site's own footer — which repeats its main menu — so
	 * that crossing from one of their pages into this one does not feel like
	 * arriving somewhere else. Replaces AddressbookFooter here rather than
	 * extending it: that component is shared by the standalone sites, and the
	 * whole point of this work is to leave them untouched.
	 *
	 * Two links are deliberately not the parent's:
	 *
	 *   - mentions légales stays ours, because this app is hosted by a different
	 *     provider and owes its own legal notice;
	 *   - the directory's home, so there is always a way back into this app
	 *     without going out through the parent site.
	 */
	import { base } from '$app/paths';
	import * as m from '$msgs';
	import { variables } from '$lib/utils/constants';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { SiteMenu, SiteMenuItem } from '$lib/interfaces/siteMenu.interface';
	import ParentSiteTree from '$lib/SiteMenu/ParentSiteTree.svelte';
	import { menuWithOwnPages } from '$lib/SiteMenu/siteMenu';

	let { menu }: { menu: SiteMenu } = $props();

	const lang = variables.DEFAULT_LANGUAGE;

	/**
	 * What the footer's tree shows: the parent's menu, plus this app's own two
	 * pages — the directory and the legal notice it owes for being hosted
	 * separately.
	 *
	 * The same helper the drawer uses, so the two cannot drift. Contact and the
	 * directory are deliberately not repeated as separate footer links any
	 * more: contact already sits in the parent's menu above, and the directory
	 * is the entry this tree ends with. Listing them twice in one footer is
	 * what made it read as two competing menus.
	 */
	const treeItems = $derived(
		menuWithOwnPages(
			base,
			capitalizeFirstLetter(m.ADDRESSBOOK_TITLE(), lang),
			capitalizeFirstLetter(m.LEGAL_NOTICES(), lang)
		)
	);
</script>

<footer class="page-footer text-xs md:text-base">
	<div class="w-full max-w-7xl mx-auto p-4 py-16 md:py-24 space-y-10">
		<!-- Row 1: the parent site's identity, linking out to it -->
		<div class="md:flex md:justify-between">
			<div class="mb-6 md:mb-0">
				<a
					href={menu.parentSite.url}
					rel="noopener"
					title={m.NAVBAR_GO_PARENT_SITE({ site: menu.parentSite.name })}
				>
					<div class="flex items-center space-x-2 lg:space-x-4">
						<img
							src={menu.parentSite.logo}
							alt={menu.parentSite.logoAlt}
							class="h-8 lg:h-12 w-auto"
							loading="lazy"
						/>
						<h4 class="h4">{menu.parentSite.name}</h4>
					</div>
				</a>
			</div>

			<!--
				The same tree the drawer shows, collapsed. A footer competes for
				height with the page above it, and a reader who has scrolled this far
				is looking for one thing rather than reading the menu — so branches
				start closed and open on request.

				It replaces a grid of columns that flattened the middle level away:
				entries the parent site groups under a heading appeared as siblings of
				that heading's own children, so the footer and the drawer disagreed
				about the shape of the same menu.
			-->
			<nav class="min-w-0 sm:w-80" aria-label={menu.parentSite.name}>
				<ParentSiteTree items={treeItems} onNavigate={() => {}} collapsible />
			</nav>
		</div>


		<hr class="opacity-20" />

		<div class="sm:flex sm:items-center sm:justify-between">
			<span>
				© {new Date().getFullYear()}
				<a href={menu.parentSite.url} rel="noopener" class="anchor">{menu.parentSite.name}</a>
			</span>
			<span>
				Site propulsé par la solution Pluripro Web créée par
				<a href="https://medecinelibre.com" class="anchor">Médecine Libre</a>.
			</span>
		</div>
	</div>
</footer>
