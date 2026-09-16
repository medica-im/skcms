<script lang="ts">

	import * as m from '$msgs';
	import { page } from '$app/state';
	import { variables } from '$lib/utils/constants.ts';
	import DocsIcon from '$lib/Icon/Icon.svelte';
	import { AppRail, AppRailTile, AppRailAnchor, getDrawerStore } from '@skeletonlabs/skeleton';
	import SoMed from '$lib/SoMed/SoMed.svelte';
	import Website from '$lib/components/Website/Website.svelte';
	import Fa from 'svelte-fa';
	import { org } from '$lib/state.svelte.js';
	import { faBlog, faCalendar } from '@fortawesome/free-solid-svg-icons';
	import BookUser from '@lucide/svelte/icons/book-user';
	import { menuNavCats } from '$var/variables.ts';
	import { siteMenu, visibleItems, displayLabel } from '$lib/SiteMenu/siteMenu';
	import { base } from '$app/paths';

	let {
		currentRailCategory = $bindable(),
		navLinks
	}: {
		currentRailCategory: string | undefined;
		navLinks: any[] | undefined;
	} = $props();

	const siteCat = page.data.organization.category.name;

	/**
	 * The parent site's menu, empty where this app is not embedded in one.
	 * Resolved once so the markup and the grid below agree on whether the
	 * second column exists.
	 */
	const parentMenu = visibleItems();
	const dirPath = page.data.directory.setting.path || '/';
	const drawerStore = getDrawerStore();

	function onClickAnchor(): void {
		drawerStore.close();
	}

	function onListItemClick(): void {
		drawerStore.close();
	}

	const classesActive = (href: string) => {
		return page.url.pathname + page.url.search === href ? 'variant-ringed-primary' : '';
	};
</script>

<!--
	Two columns only when there is a second thing to put in one. A category with
	no links leaves the rail alone in the drawer, and a standing `1fr` track
	would hold open a band of empty panel beside it — which is what the
	hamburger showed on any page outside the menu, the home page included.
-->
<div
	class="grid h-full bg-surface-50-900-token border-r border-surface-500/30 {parentMenu.length
		? 'grid-cols-[1fr]'
		: navLinks?.length
			? 'grid-cols-[auto_1fr]'
			: 'grid-cols-[auto]'}"
>
	<!--
		The rail is this app's own set of destinations. Where the parent site's
		menu is in the drawer, it is a second list of places beside that one —
		and the two do not agree: the rail's Contact is ours, the menu's is
		theirs. The menu is the one that belongs to the site the visitor thinks
		they are on, so the rail goes.
	-->
	{#if !parentMenu.length}
	<!-- App Rail -->
	<AppRail background="!bg-transparent" border="border-r border-surface-500/30">
		<AppRailAnchor
			data-sveltekit-preload-data="off"
			href="{base}/"
			selected={page.url.pathname == '/' && !currentRailCategory}
			class="lg:hidden"
			on:click={() => {
				onClickAnchor();
			}}
		>
			<svelte:fragment slot="lead"
				><DocsIcon name="home" width="w-6" height="h-6" /></svelte:fragment
			>
			<span>{m.HOME_TITLE()}</span>
		</AppRailAnchor>
		{#if dirPath != '/'}
			<AppRailAnchor
				href={dirPath}
				selected={page.url.pathname.startsWith(dirPath) && !currentRailCategory}
				class="lg:hidden"
				on:click={() => {
					onClickAnchor();
				}}
			>
				<svelte:fragment slot="lead"
					><DocsIcon name="addressBook" width="w-6" height="h-6" /></svelte:fragment
				>
				<span>{m.NAVBAR_ADDRESSBOOK()}</span>
			</AppRailAnchor>
		{/if}
		<!--
			The sites page is not advertised on a site that asked for it to be
			hidden. The route still resolves — this only stops linking to it.
		-->
		{#if siteMenu?.footer.showSites ?? true}
			<AppRailAnchor
				href="{base}/sites"
				selected={page.url.pathname == '/sites' && !currentRailCategory}
				class="lg:hidden"
				on:click={() => {
					onClickAnchor();
				}}
			>
				<svelte:fragment slot="lead"
					><DocsIcon name="mapLocationDot" width="w-6" height="h-6" /></svelte:fragment
				>
				<span>Sites</span>
			</AppRailAnchor>
		{/if}
		{#if page.data.organization.google_calendar_id && page.data.organization.google_calendar_api_key}
			<AppRailAnchor
				href="{base}/calendrier"
				selected={page.url.pathname == '/calendrier' && !currentRailCategory}
				class="lg:hidden"
				on:click={() => {
					onClickAnchor();
				}}
			>
				<svelte:fragment slot="lead"
					><Fa icon={faCalendar} size="lg" class="inline-block outline-none" /></svelte:fragment
				>
				<span>{m.CALENDAR()}</span>
			</AppRailAnchor>
		{/if}
		<!--tiles from menuNavCats:-->
		{#each menuNavCats as navCat}
			<AppRailTile bind:group={currentRailCategory} name={navCat.id} value={navCat.id}>
				<svelte:fragment slot="lead">
					<DocsIcon name={navCat.docsIcon} width="w-6" height="h-6" />
				</svelte:fragment>
				<span>{navCat.title[variables.DEFAULT_LANGUAGE]}</span>
			</AppRailTile>
		{/each}
		{#if variables.BLOG_URI}
			<AppRailAnchor
				href={variables.BLOG_URI}
				rel="external"
				class="lg:hidden"
				on:click={() => {
					onClickAnchor();
				}}
			>
				<svelte:fragment slot="lead"
					><Fa icon={faBlog} size="lg" class="inline-block outline-none" /></svelte:fragment
				>
				<span>Blog</span>
			</AppRailAnchor>
		{/if}
		{#if page.data.organization.contact?.socialnetworks}
			<SoMed data={page.data.organization.contact.socialnetworks} appRail={true} />
		{/if}
		{#if page.data.organization.contact?.websites}
			{#each page.data.organization.contact?.websites as website}
				<!-- See SkeletonAppBar: hidden under a base path, where the
				     organisation's site is the page hosting this one. -->
				{#if !base}
					<Website {website} appRail={true} />
				{/if}
			{/each}
		{/if}
		<!--
			Contact belongs to the parent site where there is one: it is their
			address, and ours would answer with the organisation behind the
			directory rather than the one the visitor came looking for.
		-->
		<AppRailAnchor
			href={siteMenu?.footer.contactHref ?? `${base}/contact`}
			rel={siteMenu ? 'noopener' : undefined}
			selected={page.url.pathname == '/contact' && !currentRailCategory}
			class="lg:hidden"
			on:click={() => {
				onClickAnchor();
			}}
		>
			<svelte:fragment slot="lead"
				><DocsIcon name="envelope" width="w-6" height="h-6" /></svelte:fragment
			>
			<span>Contact</span>
		</AppRailAnchor>
	</AppRail>
	{/if}
	{#if navLinks?.length}
		<!-- Nav Links -->
		<!--
			The panel takes whatever the rail leaves, and no fixed width: it was
			w-[360px] after an 80px rail, so on a 360px phone the list ran to 440
			and everything past the screen edge was unreachable. The drawer's own
			width is capped in Drawer.svelte, which is what reserves the strip of
			backdrop you tap to close. min-w-0 lets this shrink inside the 1fr
			track instead of forcing it wider, and the names then have to wrap —
			several are longer than a phone.
		-->
		<section class="min-w-0 space-y-4 overflow-y-auto p-4 pb-20">
			{#each navLinks as { id, title, href, list }, i}
				{#if list.filter((e: any) => e.active != false).length > 0}
					<!--
						Title: a link to the category's landing page, when it has one.

						A category without an href is a heading over pages that explain
						themselves, not a place of its own. Linking it regardless is what
						put a dead /maison-de-sante on every page of that section.
					-->
					<div
					{id}
					class="whitespace-normal px-4 font-bold uppercase text-primary-700 dark:text-primary-500"
				>
						{#if href}
							<a
								{href}
								class="hover:underline"
								data-sveltekit-preload-data="hover"
								onclick={() => {
									onListItemClick();
								}}
							>
								{title[variables.DEFAULT_LANGUAGE]}
							</a>
						{:else}
							{title[variables.DEFAULT_LANGUAGE]}
						{/if}
					</div>
					<!-- Navigation List -->
					<nav class="list-nav">
						<ul>
							{#each list.filter((e: any) => e.active != false) as { href, label, badge }}
								<li>
									<a
										{href}
										class={classesActive(href)}
										data-sveltekit-preload-data="hover"
										onclick={() => {
											onListItemClick();
										}}
									>
										<span class="flex-auto whitespace-normal">{@html label}</span>
										{#if badge}<span class="badge variant-filled-secondary">{badge}</span>{/if}
									</a>
								</li>
							{/each}
						</ul>
					</nav>
					<!-- Divider -->
					{#if i + 1 < navLinks?.length}<hr class="!my-6 opacity-50" />{/if}
				{/if}
			{/each}
		</section>
	{/if}

	<!--
		The parent site's menu, on a phone. The drawer is the only way to reach
		it below xl, where the app bar's dropdowns are hidden — without this the
		menu would simply not exist on the screens most visitors use.

		Its own section rather than a branch inside the one above: that one is
		driven by `navLinks`, which a site embedded in another one never has, so
		the two never appear together.
	-->
	{#if parentMenu.length}
		<section class="p-4 pb-20 space-y-4 overflow-y-auto">
			<nav class="list-nav">
				<ul>
					{#each parentMenu as item (item.label)}
						<li>
							{#if item.href}
								<a
									href={item.href}
									rel={item.external ? 'noopener' : undefined}
									class="min-h-11 flex items-center"
									onclick={() => onListItemClick()}
								>
									<span class="flex-auto whitespace-normal">{displayLabel(item.label)}</span>
								</a>
							{:else}
								<span class="block px-4 pt-2 text-sm font-semibold opacity-60">
									{displayLabel(item.label)}
								</span>
							{/if}

							{#if item.children?.length}
								<ul class="pl-4">
									{#each item.children as child (child.label)}
										<li>
											{#if child.href}
												<a
													href={child.href}
													rel={child.external ? 'noopener' : undefined}
													class="min-h-11 flex items-center"
													onclick={() => onListItemClick()}
												>
													<span class="flex-auto whitespace-normal">{displayLabel(child.label)}</span>
												</a>
											{:else}
												<span class="block px-4 pt-2 text-sm font-semibold opacity-60">
													{displayLabel(child.label)}
												</span>
											{/if}
											{#if child.children?.length}
												<ul class="pl-4">
													{#each child.children as grandchild (grandchild.label)}
														<li>
															<a
																href={grandchild.href}
																rel={grandchild.external ? 'noopener' : undefined}
																class="min-h-11 flex items-center"
																onclick={() => onListItemClick()}
															>
																<span class="flex-auto whitespace-normal"
																	>{displayLabel(grandchild.label)}</span
																>
															</a>
														</li>
													{/each}
												</ul>
											{/if}
										</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>
			</nav>
		</section>
	{/if}
</div>
