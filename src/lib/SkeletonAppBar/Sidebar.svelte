<script lang="ts">
	import { language } from '$lib/store/languageStore.ts';
	import * as m from '$msgs';
	import { page } from '$app/state';
	import DocsIcon from '$lib/Icon/Icon.svelte';
	import { menuNavLinks, menuNavCats } from '$var/variables.ts';
	import { AppRail, AppRailTile } from '@skeletonlabs/skeleton';
	import { variables } from '$lib/utils/constants';

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
</script>

{#if navLinks}
	<div class="hidden lg:block h-full">
		<div
			class="grid grid-cols-[auto_1fr] h-full bg-surface-50-900-token border-r border-surface-500/30"
		>
			<!-- App Rail -->
			<AppRail background="!bg-transparent" border="border-r border-surface-500/30">
				{#if page.data.organization.category.name == 'cpts'}
					<AppRailTile bind:group={currentRailCategory} name="cpts" value={'cpts'}>
						<svelte:fragment slot="lead"
							><DocsIcon name="outpatientClinic" width="w-6" height="h-6" /></svelte:fragment
						>
						<span>CPTS</span>
					</AppRailTile>
				{:else if page.data.organization.category.name == 'msp'}
					<AppRailTile bind:group={currentRailCategory} name="msp" value={'msp'}>
						<svelte:fragment slot="lead"
							><DocsIcon name="outpatientClinic" width="w-6" height="h-6" /></svelte:fragment
						>
						<span>Maison de santé</span>
					</AppRailTile>
				{/if}
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
			</AppRail>
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
