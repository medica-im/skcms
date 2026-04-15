<script lang="ts">
	import { page } from '$app/state';
	import { menuNavLinks, menuNavCats } from '$var/variables.ts';
	import { getDrawerStore, Drawer } from '@skeletonlabs/skeleton';
	import Sidebar from '$lib/SkeletonAppBar/Sidebar.svelte';
	import MobileSidebar from '$lib/SkeletonAppBar/MobileSidebar.svelte';

	const drawerStore = getDrawerStore();
	let currentRailCategory: string | undefined = $derived(
		menuNavCats.find((cat) =>
			Object.values(cat.list).some((group: any) =>
				group.href === page.url.pathname ||
				group.list.some((link: any) => link.href === page.url.pathname + page.url.search)
			)
		)?.id
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
			return linkSet.id in list;
		});
		if (_filteredMenuNavLinks.length) {
			return _filteredMenuNavLinks;
		} else {
			return;
		}
	};
	let navLinks = $derived(getMenuNavLinks());
	let widthSetting = $derived.by(() => {
		if (navLinks?.length) {
			return '';
		} else {
			return 'w-[80]';
		}
	});
</script>

<Drawer width={widthSetting}>
	{#if $drawerStore.id === 'doc-sidenav'}
		<Sidebar />
	{:else if $drawerStore.id === 'mobile'}
		<MobileSidebar bind:currentRailCategory {navLinks} />
	{:else}
		<!-- Fallback Error -->
		<div class="w-full h-full flex justify-center items-center">
			<div class="text-center space-y-2">
				<p>Invalid <code>$drawerStore.id</code> provided.</p>
			</div>
		</div>
	{/if}
</Drawer>