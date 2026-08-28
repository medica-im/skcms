<script lang="ts">

	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { variables } from '$lib/utils/constants';
	import Fa from 'svelte-fa';
	import { org } from '$lib/state.svelte.js';
	import { faCaretSquareDown } from '@fortawesome/free-regular-svg-icons';
	import {
		faBars,
		faCaretDown,
		faInfo,
		faTimeline,
		faBookMedical,
		faHouse,
		faMapLocationDot,
		faAddressBook,
		faEnvelope,
		faRightToBracket,
		faRightFromBracket,
		faUserPlus,
		faUser,
		faPalette,
		faCalendar
	} from '@fortawesome/free-solid-svg-icons';
	import BookUser from '@lucide/svelte/icons/book-user';
	import User from '$lib/SkeletonAppBar/User.svelte';
	// Types
	import type { ModalSettings } from '@skeletonlabs/skeleton';
	import type { DrawerSettings } from '@skeletonlabs/skeleton';
	// Docs
	import OutpatientClinicLogo from '$lib/Logos/OutpatientClinicLogo.svelte';
	import AddressBookLogo from '$lib/Logos/AddressBookLogo.svelte';
	import SocialNetworks from '../SoMed/SoMed.svelte';
	import Website from '$lib/components/Website/Website.svelte';
	// Components
	import { AppBar } from '@skeletonlabs/skeleton';
	import { LightSwitch } from '@skeletonlabs/skeleton';
	import MenuNavLinks from '$lib/SkeletonAppBar/MenuNavLinks.svelte';
	// Utilities
	import { popup } from '@skeletonlabs/skeleton';
	import { getModalStore } from '@skeletonlabs/skeleton';

	// Stores
	import { storeTheme } from '$lib/store/skeletonStores';
	import { getDrawerStore } from '@skeletonlabs/skeleton';
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import { appBarTitle } from '$lib/SkeletonAppBar/appBarTitle.ts';
	import { base } from '$app/paths';

	// A connected user already knows which site they are on, and the trail fills
	// up with their account controls — so they get the shorter label when the
	// organisation has one. See appBarTitle.test.ts for the full rule.
	const title = $derived(
		capitalizeFirstLetter(
			appBarTitle(page.data.organization, Boolean(page.data.session?.user)),
			variables.DEFAULT_LANGUAGE
		)
	);

	const dirPath = `${base}${page.data?.directory?.setting?.path || "/"}`;
	const drawerStore = getDrawerStore();
	const modalStore = getModalStore();
	const isMSP = page.data?.organization?.category?.name == "msp";

	// Local
	let isOsMac = false;

	// Set Search Shortkey Keys
	if (browser) {
		let os = navigator.userAgent;
		isOsMac = os.search('Mac') !== -1;
	}

	// Drawer Handler
	function drawerOpen(): void {
		const s: DrawerSettings = {
			id: 'mobile'
		};
		drawerStore.open(s);
	}

	// Search
	function triggerSearch(): void {
		const d: ModalSettings = {
			type: 'component',
			component: 'modalSearch',
			position: 'item-start'
		};
		modalStore.trigger(d);
	}

	// Keyboard Shortcut (CTRL/⌘+K) to Focus Search
	function onWindowKeydown(e: KeyboardEvent): void {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			// Prevent default browser behavior of focusing URL bar
			e.preventDefault();
			// If modal currently open, close modal (allows to open/close search with CTRL/⌘+K)
			$modalStore.length ? modalStore.close() : triggerSearch();
		}
	}

	const themes = [
		{ type: 'skeleton', name: 'Skeleton', icon: '💀' },
		{ type: 'wintry', name: 'Wintry', icon: '🌨️' },
		{ type: 'modern', name: 'Modern', icon: '🤖' },
		{ type: 'rocket', name: 'Rocket', icon: '🚀' },
		{ type: 'seafoam', name: 'Seafoam', icon: '🧜‍♀️' },
		{ type: 'vintage', name: 'Vintage', icon: '📺' },
		{ type: 'sahara', name: 'Sahara', icon: '🏜️' },
		{ type: 'hamlindigo', name: 'Hamlindigo', icon: '👔' },
		{ type: 'gold-nouveau', name: 'Gold Nouveau', icon: '💫' },
		{ type: 'crimson', name: 'Crimson', icon: '⭕' }
		// { type: 'seasonal', name: 'Seasonal', icon: '🎆' }
		// { type: 'test', name: 'Test', icon: '🚧' },
	];

	const setTheme: SubmitFunction = ({ formData }) => {
		const theme = formData.get('theme')?.toString();

		if (theme) {
			document.body.setAttribute('data-theme', theme);
			$storeTheme = theme;
		}
	};
</script>

<!-- NOTE: using stopPropagation to override Chrome for Windows search shortcut -->
<svelte:window on:keydown|stopPropagation={onWindowKeydown} />

<!--
	Tighter padding and a smaller gap below lg, Skeleton's `p-4`/`gap-4` from
	there up.

	`p-4` is 16px on every edge, which sets the bar's height as much as its
	content does and insets the hamburger from the edge of the screen. On a
	phone that is width and height spent on air: `p-2` halves the vertical cost
	and moves the hamburger toward the start of the row, where a thumb reaches
	it. The gap between the three slots comes down with it, since a 16px gutter
	between clusters reads as loose once the padding around them is 8px.
-->
<!--
	slotTrail overrides Skeleton's own `space-x-4` on the trail cluster. The
	theme button, the user button and sign-out then sit `space-x-2` apart below
	lg — see the matching gap in User.svelte, which has to be set there because
	those two are its children, not the trail's.
-->
<AppBar
	shadow="shadow-lg"
	padding="p-2 lg:p-4"
	gap="gap-2 lg:gap-4"
	slotTrail="!space-x-2 lg:!space-x-4"
>
	<svelte:fragment slot="lead">
		<!-- Hamburger Menu -->
		<!--
			44px (`w-11`), the touch-target minimum, and deliberately not smaller.

			This button was shrunk twice while the bar was being tightened —
			to `btn-icon-sm`'s 33px, then to 38px — on the reasoning that it was
			the tallest thing in the row and the guideline is about tappable area
			rather than the painted circle. Both were wrong for who uses this
			site: patients and healthcare professionals in France average 50+,
			and a larger thumb has a wider contact patch and less precise aim.
			44px is the floor for that hand, not a nicety, and this is the
			navigation control for the whole site.

			The height reduction comes from the bar's padding instead, which
			costs nobody anything. A width rather than the `btn-icon-sm` preset,
			which also lowers font-size and would shrink the bars glyph itself.
		-->
		<button on:click={drawerOpen} class="btn-icon !w-11 xl:!hidden">
			<Fa icon={faBars} />
		</button>
	</svelte:fragment>
	<!-- Logo -->
	<a data-sveltekit-preload-data="off" href="/" title={m.NAVBAR_GO_HOME()}>
		<!-- gap only from lg, where there is a logo for it to separate. -->
		<div class="flex items-center lg:gap-2">
			<!--
				No logo below lg: the bar is a fixed cost on every page and the
				icon is the part of it that carries no information — the title
				beside it already names the site, and the hamburger already marks
				this as the toolbar. Dropping it on mobile buys back its width for
				the title and lets the row size to the text alone.
			-->
			<div class="hidden lg:inline-block">
				{#if page.data?.organization?.category?.name == 'msp'}
					<div class="w-6 h-6"><OutpatientClinicLogo /></div>
				{:else if page.data?.organization?.category?.name == 'cpts'}
					<Fa icon={faAddressBook} size="2x" class="align-middle" />
				{/if}
			</div>
			<div class="block lg:hidden">
				{title}
			</div>
			<span class="max-lg:hidden"
				><h4 class="h4">
					{title}
				</h4>
			</span>
		</div>
	</a>
	<svelte:fragment slot="trail">
		<!-- Search -->
		<!--div class="md:inline md:ml-4">
			<button class="btn btn-sm variant-ghost-surface hidden lg:inline-block" on:click={triggerSearch}>
				<i class="fa-solid fa-magnifying-glass" />
				<span class="hidden lg:inline-block">Search</span>
				<span class="hidden lg:inline-block text-[11px] font-bold opacity-60 pl-2">{isOsMac ? '⌘' : 'Ctrl'}+K</span>
			</button>
		</div-->

		<!-- Navigate -->
		<div class="relative hidden xl:block">
			<!-- trigger -->
			<button
				class="btn hover:variant-soft-primary"
				use:popup={{ event: 'click', target: 'features' }}
			>
				<span>{m.NAVBAR_NAVIGATE()}</span>
				<span class="opacity-50"><Fa icon={faCaretDown} size="sm" /></span>
			</button>
			<!-- popup -->
			<!-- prettier-ignore -->
			<div class="card p-4 w-60 shadow-xl" data-popup="features">
				<nav class="list-nav">
					<ul>
						{#if dirPath !== "/"}
						<li>
							<a data-sveltekit-preload-data="off" href="{base}/">
								<span class="w-6 text-center"><Fa icon={faHouse} /></span>
								<span>{m.HOME_TITLE()}</span>
							</a>
						</li>
						{/if}
						<li>
							<a data-sveltekit-preload-data="tap" href={dirPath}>
								<span class="w-6 text-center"><Fa icon={faAddressBook} /></span>
								<span>{m.NAVBAR_ADDRESSBOOK()}</span>
							</a>
						</li>
						<li>
							<a href="{base}/sites">
								<span class="w-6 text-center"><Fa icon={faMapLocationDot} /></span>
								<span>Sites</span>
							</a>
						</li>
						{#if page.data.organization.google_calendar_id && page.data.organization.google_calendar_api_key}
						<li>
							<a href="{base}/calendrier">
								<span class="w-6 text-center"><Fa icon={faCalendar} /></span>
								<span>{m.CALENDAR()}</span>
							</a>
						</li>
						{/if}
						<li>
							<a href="{base}/contact">
								<span class="w-6 text-center"><Fa icon={faEnvelope} /></span>
								<span>Contact</span>
							</a>
						</li>
					</ul>
				</nav>
			</div>
		</div>
		{#if isMSP}
		<div class="hidden">
			<!-- trigger -->
			<button
				class="btn hover:variant-soft-primary"
				use:popup={{ event: 'click', target: 'facility' }}
			>
				<span>{m.OUTPATIENT_CLINIC()}</span>
				<span class="opacity-50"><Fa icon={faCaretDown} /></span>
			</button>
			<!-- popup -->
			<!-- prettier-ignore -->
			<div class="card p-4 w-60 shadow-xl" data-popup="facility">
				<nav class="list-nav">
					<ul>
						{#if page.data?.organization?.category?.name == "msp"}
						<li>
							<a href="{base}/{ page.data.organization.category.slug }/a-propos">
								<span class="w-6 text-center"><Fa icon={faInfo} /></span>
								<span>{m.NAVBAR_ABOUT()}</span>
							</a>
							{#if variables.TIMELINE}
							<a href="{base}/{ page.data.organization.category.slug }/chronologie">
								<span class="w-6 text-center"><Fa icon={faTimeline} /></span>
								<span>{m.NAVBAR_TIMELINE()}</span>
							</a>
							{/if}
							<!--hr class="my-4"-->
							<a href="{base}/{page.data.organization.category.slug }/projet-de-sante">
								<span class="w-6 text-center"><Fa icon={faBookMedical} /></span>
								<span>{m.NAVBAR_HEALTH_PROJECT()}</span>
							</a>
						</li>
					{/if}
					</ul>
				</nav>
			</div>
		</div>
		{/if}
		<div class="relative hidden xl:block">
			<MenuNavLinks />
		</div>

		<!-- trigger-->
		<!--
			min-h-11 for the same reason as the hamburger: `btn-sm` is 32px tall,
			12px under the touch target this site's readers need. A minimum
			height rather than a bigger button — the padding grows, the label and
			the width do not, so the row keeps its proportions.
		-->
		<button
			class="btn-sm lg:btn-md btn hover-soft-primary min-h-11"
			use:popup={{ event: 'click', target: 'theme' }}
		>
			<span class="2xl:hidden">
				<Fa icon={faPalette} size="sm" />
			</span>
			<span class="hidden 2xl:inline-block">{m.NAVBAR_THEME()}</span>
			<span class="opacity-50"><Fa icon={faCaretDown} /></span>
		</button>
		<!-- popup -->
		{#if browser}
			<div class="card p-4 w-60 shadow-xl" data-popup="theme">
				<section class="flex justify-between items-center">
					<h6 class="h6">Mode</h6>
					<LightSwitch />
				</section>
				<hr class="my-4" />
				<nav class="list-nav p-4 -m-4 max-h-64 lg:max-h-[500px] overflow-y-auto">
					<form action="{base}/?/setTheme" method="POST" use:enhance={setTheme}>
						<ul>
							{#each themes as { icon, name, type }}
								<li>
									<button
										class="option w-full h-full"
										type="submit"
										name="theme"
										value={type}
										class:bg-primary-active-token={$storeTheme === type}
									>
										<span>{icon}</span>
										<span class="flex-auto text-left">{name}</span>
									</button>
								</li>
							{/each}
						</ul>
					</form>
				</nav>
			</div>
		{/if}

		<!-- Social -->
		<!-- prettier-ignore -->
		<div class="relative hidden xl:block">
			{#if page.data.organization?.contact?.socialnetworks}
            <SocialNetworks data={page.data.organization.contact.socialnetworks} appBar={true} />
			{/if}
			{#if variables.BLOG_URI}
			<a href={variables.BLOG_URI} title={'blog'} class="btn hover:variant-soft-primary" target="_blank" rel="noreferrer">
				<span>Blog</span>
			</a>
			{/if}
			{#if page.data.organization?.contact?.websites}
			{#each page.data.organization?.contact?.websites as website}
			<!-- Only when this instance is served at a domain root. Under a base
			     path the app is a section of someone else's site — the
			     organisation's own website is the page around it, so linking
			     out to it from the toolbar sends a visitor in a circle. -->
			{#if !base}
			<Website {website} appBar={true} />
			{/if}
			{/each}
			{/if}

        </div>

		<User />
	</svelte:fragment>
</AppBar>
