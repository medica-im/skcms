<script lang="ts">
	import { getDrawerStore, Drawer } from '@skeletonlabs/skeleton';
	import Sidebar from '$lib/SkeletonAppBar/Sidebar.svelte';
	import MobileSidebar from '$lib/SkeletonAppBar/MobileSidebar.svelte';

	import { setContext } from 'svelte';

	let widthSetting = $state({ width: 'w-[80]' });
	setContext('widthSetting', widthSetting);
	const drawerStore = getDrawerStore();
</script>

<Drawer width={widthSetting.width}>
	{#if $drawerStore.id === 'doc-sidenav'}
		<Sidebar />
	{:else if $drawerStore.id === 'mobile'}
		<MobileSidebar />
	{:else}
		<!-- Fallback Error -->
		<div class="w-full h-full flex justify-center items-center">
			<div class="text-center space-y-2">
				<p>Invalid <code>$drawerStore.id</code> provided.</p>
			</div>
		</div>
	{/if}
</Drawer>
