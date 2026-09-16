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
		<!--
			The identity and the seven menu divisions across five columns.

			A grid rather than CSS columns, because each block gets its own cell
			whatever its height. Columns were tried and cannot do this: they
			balance by height, and the one deep division — "Notre activité" and
			its nested group — is on its own taller than a fifth of everything
			here, so any track tall enough to hold it unsplit swallowed about
			2.7 columns' worth and left two empty. Splitting it instead would
			make one division read as two unrelated groups.

			So eight blocks over five columns wrap to a second grid row. The two
			rows share the same five tracks, which is what keeps it one layout
			rather than the separate band the logo used to sit in above the menu.

			`items-start` so a one-line division does not stretch to the height
			of the tallest beside it.
		-->
		<div
			class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5
				gap-x-8 gap-y-7 items-start"
		>
			<div>
				<a
					href={menu.parentSite.url}
					rel="noopener"
					title={m.NAVBAR_GO_PARENT_SITE({ site: menu.parentSite.name })}
				>
					<!--
						The name written out here, where the app bar has only room
						for the acronym. A footer is where someone who arrived on
						a deep page finds out whose site they are on, and "UNIPA"
						alone does not tell them.

						Stacked from lg: at a fifth of the row the long name has
						no width to sit beside a logo, and wrapping it there
						pushed the logo out of line with the headings beside it.
					-->
					<div class="flex items-center gap-2 lg:flex-col lg:items-start lg:gap-3">
						<img
							src={menu.parentSite.logo}
							alt={menu.parentSite.logoAlt}
							class="h-8 lg:h-10 w-auto"
							loading="lazy"
						/>
						<span class="text-sm font-semibold leading-snug">
							{menu.parentSite.longName ?? menu.parentSite.name}
						</span>
					</div>
				</a>
			</div>

			<!--
				The same tree the drawer shows, and shown the same way: whole. A
				disclosure version was tried here and read worse than the height
				it saved was worth.

				`display: contents` on its list (flowIntoParent) so the divisions are
				siblings of the identity block above and all eight blocks flow
				through the same columns, rather than the whole menu landing in
				one of them.
			-->
			<nav class="contents" aria-label={menu.parentSite.name}>
				<ParentSiteTree items={treeItems} onNavigate={() => {}} sectionHeadings flowIntoParent />
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
