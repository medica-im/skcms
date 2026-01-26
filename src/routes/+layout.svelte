<script lang="ts">
	import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
	import { beforeNavigate, invalidate } from '$app/navigation';
	import { updated } from '$app/state';
	import { setLocale } from "../paraglide/runtime.js";
	import { autoModeWatcher } from '@skeletonlabs/skeleton';
	import { initializeStores, Modal } from '@skeletonlabs/skeleton';
    import '../app.postcss';
    import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
    import { storePopup } from '@skeletonlabs/skeleton';
    import Sidebar from '$lib/SkeletonAppBar/Sidebar.svelte';
    import { afterNavigate } from '$app/navigation';
    import { fly } from 'svelte/transition';
    import { page } from '$app/state';
    import { variables } from '$lib/utils/constants';
    import favIcon from '$assets/favicon/favicon.svg';
    import maskIcon from '$assets/favicon/mask-icon.svg';
    import appleTouchIcon from '$assets/favicon/apple-touch-icon.png';
    import { AppShell } from '@skeletonlabs/skeleton';
    import { Toast } from '@skeletonlabs/skeleton';
    // Modal Components
    import Search from '$lib/Search/Search.svelte';
    // Types
    import type { ModalComponent } from '@skeletonlabs/skeleton';
    // components
    import SkeletonAppBar from '$lib/SkeletonAppBar/SkeletonAppBar.svelte';
    import Drawer from '$lib/Drawer/Drawer.svelte';
    import Footer from '$lib/Footer/Footer.svelte';
	import AddressbookFooter from '$lib/Footer/AddressbookFooter.svelte';

    // Theme stylesheet is loaded from LayoutServerData
    import { QueryClientProvider, QueryClient } from '@tanstack/svelte-query'
    import type { ComponentProps } from 'svelte';
    import { scrollY } from '$lib/store/scrollStore';
	import { locales, localizeHref } from '$prgld/runtime.js';
	import { programsNavLinks } from '$var/variables.ts';
	import { PUBLIC_PLAUSIBLE_SCRIPT_SRC } from '$env/static/public';

	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) {
			location.href = to.url.href;
		}
	});

	setLocale('fr');
	initializeStores();

    function scrollHandler(event: ComponentProps<AppShell>['scroll']) {
	scrollY.set(event.currentTarget.scrollTop);
}

    storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });

    afterNavigate((params: any) => {
		// Scroll to top
		const isNewPage: boolean =
			params.from && params.to && params.from.route.id !== params.to.route.id;
		const elemPage = document.querySelector('#page');
		if (isNewPage && elemPage !== null) {
			elemPage.scrollTop = 0;
		}
	});

    function matchList(pageUrlPath: string): boolean {
		const url = ['maison-de-sante/', 'education-therapeutique', 'education-sante', 'prevention', 'soins'];
		let match = url.filter(function (e) {
			let m: boolean;
			try {
				m = pageUrlPath.includes(e);
			} catch (err) {
				m = false;
			}
			return m;
		});
		return Boolean(match.length);
	}

    // Registered list of Components for Modals
    const modalComponentRegistry: Record<string, ModalComponent> = {
		modalSearch: { ref: Search }
	};

	const queryClient = new QueryClient();
	const dataDomain = () => {
		const PREFIX = 'https://';
		const baseURI = variables.BASE_URI;
		if ( !baseURI.startsWith(PREFIX) ) {
			throw new Error("Base URI must start with 'https://' !");
		}
		return baseURI.slice(PREFIX.length)
	}
</script>

<svelte:head>
	{@html '<script>(' + autoModeWatcher.toString() + ')();</script>'}
	<link rel="icon" href="{favIcon}">
	<link rel="mask-icon" href="{maskIcon}" color="#000000">
	<link rel="apple-touch-icon" href="{appleTouchIcon}">
	{#if PUBLIC_PLAUSIBLE_SCRIPT_SRC}
	<script defer data-domain={dataDomain()} src={PUBLIC_PLAUSIBLE_SCRIPT_SRC}></script>
	{/if}
	<!--set .env variable VITE_NOINDEX to "true" to prevent all search engines that support the noindex rule (including Google) from indexing a page on your site--> 
	{#if variables.NOINDEX==true}
	<meta name="robots" content="noindex">
	{/if}
</svelte:head>
<!-- Overlays -->
<Modal components="{modalComponentRegistry}"></Modal>
<Toast></Toast>

<Drawer />
<AppShell class="z-[90000]" regionpage="overflow-y-scroll" slotfooter="bg-black p-4" on:scroll="{scrollHandler}">
		<svelte:fragment slot="header">
			<SkeletonAppBar/>
		</svelte:fragment>
		<svelte:fragment slot="sidebarLeft">
			<Sidebar/>
		</svelte:fragment>
		<!-- Page Content -->
		<QueryClientProvider client={queryClient}>
			<slot></slot>
		</QueryClientProvider>
		<svelte:fragment slot="pageFooter">
			{#if page.data.organization?.category.name=="msp"}
				<Footer {programsNavLinks}/>
			{:else if page.data.organization?.category.name=="cpts"}
				<AddressbookFooter/>
			{/if}
		</svelte:fragment>
	</AppShell>
	<div style="display:none">
		{#each locales as locale}
			<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
		{/each}
	</div>