<script lang="ts">
	import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
	import * as m from '$msgs';
	import { page } from '$app/state';
	import { variables } from '$lib/utils/constants.ts';
	import DocsIcon from '$lib/Icon/Icon.svelte';
	import { AppRail, AppRailTile, AppRailAnchor, getDrawerStore } from '@skeletonlabs/skeleton';
	import SoMed from '$lib/SoMed/SoMed.svelte';
	import Website from '$lib/components/Website/Website.svelte';
	import Fa from 'svelte-fa';
	import { faBlog } from '@fortawesome/free-solid-svg-icons';

	let {
		currentRailCategory=$bindable(),
		navLinks
	}: {
		currentRailCategory: string | undefined;
		navLinks: any[] | undefined;
	} = $props();

	const siteCat = page.data.organization.category.name;
	const drawerStore = getDrawerStore();

	function onClickAnchor(): void {
		drawerStore.close();
	}

	function onListItemClick(): void {
		drawerStore.close();
	}

	const classesActive = (href: string) => {
		return page.url.pathname == href ? 'variant-ringed-primary' : '';
	};
</script>

<div
	class="grid grid-cols-[auto_1fr] h-full bg-surface-50-900-token border-r border-surface-500/30"
>
	<!-- App Rail -->
	<AppRail background="!bg-transparent" border="border-r border-surface-500/30">
		{#if siteCat == 'msp'}
			<AppRailAnchor
				data-sveltekit-preload-data="off"
				href="/"
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
		{/if}
		<AppRailAnchor
			href={siteCat == 'msp' ? '/annuaire' : '/'}
			selected={page.url.pathname.startsWith('/annuaire') && !currentRailCategory}
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
		{#if siteCat == 'msp'}
			<AppRailAnchor
				href="/sites"
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
		{#if page.data.organization.category.name == 'msp'}
			<AppRailTile bind:group={currentRailCategory} name="msp" value={'msp'}>
				<svelte:fragment slot="lead"
					><DocsIcon name="outpatientClinic" width="w-6" height="h-6" /></svelte:fragment
				>
				<span>Maison de santé</span>
			</AppRailTile>
			<AppRailTile bind:group={currentRailCategory} name="education" value={'education'}>
				<svelte:fragment slot="lead"
					><DocsIcon name="faPersonChalkboard" width="w-6" height="h-6" /></svelte:fragment
				>
				<span>Éducation</span>
			</AppRailTile>
			<AppRailTile bind:group={currentRailCategory} name="soins" value={'soins'}>
				<svelte:fragment slot="lead"
					><DocsIcon name="faHandHoldingMedical" width="w-6" height="h-6" /></svelte:fragment
				>
				<span>Soins</span>
			</AppRailTile>
			<AppRailTile bind:group={currentRailCategory} name="prevention" value={'prevention'}>
				<svelte:fragment slot="lead"
					><DocsIcon name="faShieldHeart" width="w-6" height="h-6" /></svelte:fragment
				>
				<span>Prévention</span>
			</AppRailTile>

			<hr class="opacity-30" />
		{/if}
		<AppRailAnchor
			href="/contact"
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
			{#each page.data.organization.contact?.websites as website }
			{#if website.url!==ORIGIN}
			<Website {website} appRail={true} />
			{/if}
			{/each}
		{/if}
	</AppRail>
	{#if navLinks?.length}
		<!-- Nav Links -->
		<section class="p-4 pb-20 space-y-4 overflow-y-auto w-[360px]">
			{#each navLinks as { id, title, href, list }, i}
				{#if list.filter((e: any) => e.active != false).length > 0}
					<!-- Title -->
					<div {id} class="text-primary-700 dark:text-primary-500 font-bold uppercase px-4">
						{title[variables.DEFAULT_LANGUAGE]}
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
										<span class="flex-auto">{@html label}</span>
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
</div>
