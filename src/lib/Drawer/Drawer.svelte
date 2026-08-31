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
	// One width, in both states: a constant share of the screen.
	//
	// The drawer used to size itself per state, and the two states drifted
	// apart. The rail-only state passed `w-[80]`, which is not a real Tailwind
	// class — it emitted no CSS, but Skeleton only falls back to its own
	// `w-[90%]` when the string is empty, so a truthy non-class left the drawer
	// with no width at all and it sized to its contents by accident. Replacing
	// it with a real `max-w-[80px]` did what it said instead, pinning the whole
	// drawer to the 80px rail: tapping the hamburger showed a column of icons
	// and no menu.
	//
	// A percentage avoids that whole class of bug — it does not depend on what
	// is inside the drawer, so neither state can quietly stop matching the
	// other. 85% also keeps the dismiss target honest: the strip of backdrop
	// beside the panel is the only way to close the drawer by tapping, and 15%
	// of the narrowest phone worth supporting is 48px, above the 44px minimum
	// this project holds itself to. max-w-sm stops it sprawling on a tablet,
	// where 85% would be far more than the links need.
	const widthSetting = 'w-[85%] max-w-sm';
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