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
	// Cap the panel at a share of the viewport rather than letting it size to
	// its contents: the strip of backdrop left over is the only way to dismiss
	// the drawer by tapping, and at a fixed width it came out 36px on a 360px
	// phone — under the 44px a finger needs. 85% leaves 54px there at 360 and
	// grows with the screen, while max-w-sm stops the panel sprawling on a
	// tablet where 85% would be far more than the links need.
	let widthSetting = $derived.by(() => {
		if (navLinks?.length) {
			return 'w-[85%] max-w-sm';
		} else {
			return 'w-[85%] max-w-[80px]';
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