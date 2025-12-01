<script lang="ts">
	import { getContext } from 'svelte';
	import { language } from '$lib/store/languageStore.ts';
	import * as m from '$msgs';
	import { page } from '$app/state';
	import { variables } from '$lib/utils/constants.ts';
	import DocsIcon from '$lib/Icon/Icon.svelte';
	import { menuNavLinks, menuNavCats } from '$var/variables.ts';
	import { AppRail, AppRailTile, AppRailAnchor, getDrawerStore } from '@skeletonlabs/skeleton';
	import SoMed from '$lib/SoMed/SoMed.svelte';
	import Fa from 'svelte-fa';
	import { faBlog } from '@fortawesome/free-solid-svg-icons';

	const siteCat = page.data.organization.category.name;
	const widthSetting: { width: string } = $state(getContext('widthSetting'));
	const drawerStore = getDrawerStore();

	function onClickAnchor(): void {
		drawerStore.close();
	}

	function onListItemClick(): void {
		drawerStore.close();
	}

	let basePath: string = $derived(page.url.pathname.split('/')[1]);
	let currentRailCategory: string | undefined = $derived(
		menuNavCats.find((e) => e.list.includes(basePath))?.id
	);

	const getMenuNavLinks = (): any[] | undefined => {
		if (!currentRailCategory) {
			return;
		}
		const cat = menuNavCats.find((cat) => cat.id == currentRailCategory);
		const list = cat?.list;
		if (!list) {
			return;
		}
		let _filteredMenuNavLinks: any[] = Object.values(menuNavLinks).filter((linkSet: any) => {
			return list.some((e: any) => e == linkSet.id);
		});
		if (_filteredMenuNavLinks.length) {
			return _filteredMenuNavLinks;
		} else {
			return;
		}
	};
	let navLinks = $derived(getMenuNavLinks());

	let classesActive = $derived((href: string) => {
		return page.url.pathname == href ? 'variant-ringed-primary' : '';
	});
	// Set the width of the Drawer component to hide empty space.
	$effect(() => {
		if (widthSetting) {
			if (navLinks?.length) {
				widthSetting.width = '';
			} else {
				widthSetting.width = 'w-[80]';
			}
		}
	});

	$inspect(currentRailCategory, navLinks, widthSetting);
</script>

<div
	class="grid grid-cols-[auto_1fr] h-full bg-surface-50-900-token border-r border-surface-500/30"
>
	<!-- App Rail -->
	<AppRail background="!bg-transparent" border="border-r border-surface-500/30">
		{#if ( siteCat == "msp" )}
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
			href={siteCat == "msp" ? "/annuaire" : "/"}
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
		{#if ( siteCat == "msp" )}
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
	</AppRail>
	{#if navLinks?.length}
		<!-- Nav Links -->
		<section class="p-4 pb-20 space-y-4 overflow-y-auto w-[360px]">
			{#each navLinks as { id, title, href, list }, i}
				{#if list.filter((e) => e.active != false).length > 0}
					<!-- Title -->
					<div {id} class="text-primary-700 dark:text-primary-500 font-bold uppercase px-4">
						{title[$language]}
					</div>
					<!-- Navigation List -->
					<nav class="list-nav">
						<ul>
							{#each list.filter((e) => e.active != false) as { href, label, badge }}
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