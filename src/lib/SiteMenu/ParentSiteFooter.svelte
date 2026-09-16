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

	let { menu }: { menu: SiteMenu } = $props();

	const lang = variables.DEFAULT_LANGUAGE;

	/**
	 * The columns of the footer's link grid: one per top-level menu entry that
	 * has children, since a lone link makes a poor column heading.
	 */
	const columns = $derived(
		(menu.items ?? []).filter((item) => (item.children?.length ?? 0) > 0)
	);

	/** Top-level entries without children, shown as a row of plain links. */
	const flatLinks = $derived(
		(menu.items ?? []).filter((item) => (item.children?.length ?? 0) === 0)
	);

	/**
	 * A column's links, flattened one level: the source menu groups some entries
	 * under an intermediate heading, which is useful in a dropdown but only adds
	 * indentation in a footer.
	 */
	function linksOf(item: SiteMenuItem): SiteMenuItem[] {
		return (item.children ?? []).flatMap((child) =>
			(child.children?.length ?? 0) > 0 ? (child.children ?? []) : [child]
		);
	}
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

			<!-- Row 1b: the parent site's menu, as columns -->
			<div class="grid grid-cols-2 gap-8 sm:gap-6 sm:grid-cols-3">
				{#each columns as column (column.label)}
					<div>
						<h5 class="h5 mb-4 font-semibold uppercase">{column.label}</h5>
						<ul class="space-y-2">
							{#each linksOf(column) as link (link.label)}
								<li>
									<a
										href={link.href}
										rel={link.external ? 'noopener' : undefined}
										class="hover:underline">{link.label}</a
									>
								</li>
							{/each}
						</ul>
					</div>
				{/each}

				<!-- Our own column: the links that are ours, not the parent's -->
				<div>
					<h5 class="h5 mb-4 font-semibold uppercase">
						{capitalizeFirstLetter(m.ADDRESSBOOK_TITLE(), lang)}
					</h5>
					<ul class="space-y-2">
						<li>
							<a href="{base}/" class="hover:underline" title={m.NAVBAR_GO_DIRECTORY_HOME()}>
								{capitalizeFirstLetter(m.ADDRESSBOOK_TITLE(), lang)}
							</a>
						</li>
						{#if menu.footer.showSites}
							<li>
								<a href="{base}/sites" class="hover:underline">
									{capitalizeFirstLetter(m.SITES_TITLE(), lang)}
								</a>
							</li>
						{/if}
						<li>
							<a href={menu.footer.contactHref} rel="noopener" class="hover:underline">
								{capitalizeFirstLetter(m.CONTACT_TITLE(), lang)}
							</a>
						</li>
						<li>
							<!--
								Ours, and served from this app: a base-relative path,
								never the parent site's.
							-->
							<a href="{base}/{menu.footer.legalHref}" class="hover:underline">
								{capitalizeFirstLetter(m.LEGAL_NOTICES(), lang)}
							</a>
						</li>
						{#each menu.footer.extraLinks ?? [] as extra (extra.label)}
							<li>
								<a
									href={extra.href}
									rel={extra.external ? 'noopener' : undefined}
									class="hover:underline">{extra.label}</a
								>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>

		{#if flatLinks.length}
			<div class="flex flex-wrap gap-x-6 gap-y-2">
				{#each flatLinks as link (link.label)}
					<a
						href={link.href}
						rel={link.external ? 'noopener' : undefined}
						class="hover:underline">{link.label}</a
					>
				{/each}
			</div>
		{/if}

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
