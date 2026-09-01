<script lang="ts">
	import { page } from '$app/state';
	import { menuNavCats } from '$var/variables.ts';
	import { getDrawerStore, Drawer } from '@skeletonlabs/skeleton';
	import Sidebar from '$lib/SkeletonAppBar/Sidebar.svelte';
	import MobileSidebar from '$lib/SkeletonAppBar/MobileSidebar.svelte';

	const drawerStore = getDrawerStore();
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
	// The drawer is only as wide as it has something to show.
	//
	// With a category open it holds the rail plus that category's links, and
	// takes a share of the screen: 85% leaves 15% of backdrop beside it, which
	// is the only way to dismiss it by tapping — 48px on the narrowest phone
	// worth supporting, above the 44px minimum this project holds itself to.
	// max-w-sm stops it sprawling on a tablet, where 85% is far more than the
	// links need.
	//
	// With no category open there is nothing but the rail of icons, so the
	// drawer sizes to it. A fixed share here held open a band of empty panel
	// beside the icons — which is what the hamburger showed on the home page,
	// since a page outside the menu selects no category.
	//
	// w-auto, not a width that merely looks small: the previous version of this
	// passed `w-[80]`, not a real Tailwind class, so it emitted no CSS while
	// still being truthy enough to suppress Skeleton's own `w-[90%]` default.
	// It sized to content by accident, and the accident broke the moment it was
	// replaced with a class that meant something.
	const widthSetting = $derived(navLinks?.length ? 'w-[85%] max-w-sm' : 'w-auto');
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