<script lang="ts">
	import { beforeNavigate, invalidateAll } from '$app/navigation';
	import { updated } from '$app/state';
	import { setLocale } from "../paraglide/runtime.js";
	import { initializeStores, Modal } from '@skeletonlabs/skeleton';
    import '../app.postcss';
	import '$lib/assets/css/svelte-select.css';
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
	import { PUBLIC_PLAUSIBLE_SCRIPT_SRC } from '$env/static/public';

	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) {
			location.href = to.url.href;
		}
	});

	// Signing in or out changes which data the API is willing to send (avatars
	// gated by access level, for instance). Auth.js redirects back to the same
	// route, so SvelteKit reuses the cached server load and role-scoped data
	// goes stale. invalidateAll() re-runs every load, server ones included, so
	// the UI settles on the new role without the user pressing reload.
	let lastSessionUser: string | null | undefined = undefined;
	$effect(() => {
		const current = page.data.session?.user?.email ?? null;
		if (lastSessionUser !== undefined && lastSessionUser !== current) {
			invalidateAll();
		}
		lastSessionUser = current;
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
	// Plausible wants the bare hostname this site is served on.
	//
	// From the request rather than from variables.BASE_URI: that is relative in
	// the browser (see lib/utils/appUrl.ts), so slicing a scheme off it threw
	// "Base URI must start with 'https://'" during hydration — which aborted
	// the whole client render and left a page that painted from SSR and then
	// vanished. page.url is the address actually being viewed, which is also
	// the right answer when one build serves several hostnames.
	const dataDomain = () => page.url.hostname;
</script>

<svelte:head>
	<!-- autoModeWatcher now runs from src/app.html: see the note there. -->
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
<AppShell class="z-[90000]" slotHeader="relative z-20" regionpage="overflow-y-scroll" slotfooter="bg-black p-4" on:scroll="{scrollHandler}">
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
				<Footer />
			{:else if page.data.organization?.category.name=="cpts"}
				<AddressbookFooter/>
			{/if}
		</svelte:fragment>
	</AppShell>