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
	import ParentSiteNav from '$lib/SiteMenu/ParentSiteNav.svelte';
	import { siteMenu, visibleItems } from '$lib/SiteMenu/siteMenu';
	// Utilities
	import { popup } from '@skeletonlabs/skeleton';
	import { getModalStore } from '@skeletonlabs/skeleton';

	// Stores
	import { storeTheme } from '$lib/store/skeletonStores';
	import { initialTheme } from '$lib/theme/initialTheme';
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
		// The parent site's own theme, where it has one and only on that site:
		// elsewhere it is a palette belonging to somebody else's brand, sitting
		// in a list of neutral ones. Which theme that is comes from the site's
		// own data — naming it here would put one tenant's id in the component
		// every tenant renders.
		...(siteMenu?.parentSite.theme
			? [
					{
						type: siteMenu.parentSite.theme,
						name: siteMenu.parentSite.name,
						icon: siteMenu.parentSite.themeIcon ?? '🎨'
					}
				]
			: []),
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


	// Start the switcher on whatever the page was actually rendered with.
	//
	// Without this the store's own default decided, and it could not know the
	// site's: the `theme` cookie is HttpOnly, so the browser cannot read what
	// the server chose. The dropdown therefore said Wintry on a site rendering
	// its own palette from SITE_THEME — visible on unipa with cookies and site
	// data cleared.
	//
	// Only when nothing is stored. SITE_THEME is a default, not a policy: the
	// switcher has to keep working and a visitor's choice has to survive a
	// reload, so a stored value always wins. initialTheme holds that rule.
	//
	// An `$effect` rather than a plain statement at init, because this
	// component initialises before `page.data` is populated: read there,
	// `page.data.theme` was undefined, initialTheme correctly fell back to
	// 'wintry', and the seed wrote that — reproducing the very bug it was
	// meant to fix. The effect reruns when the data arrives, and the
	// `!$storeTheme` guard makes it a no-op from then on.
	$effect(() => {
		if (!browser) return;
		const siteTheme = page.data.theme;
		if (!siteTheme || $storeTheme) return;
		$storeTheme = initialTheme($storeTheme, siteTheme);
	});

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
	slotTrail="!space-x-1 lg:!space-x-4"
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
		<!--
			On the left, unless this app is embedded in a site that puts it on
			the right — unipa.fr does, and a visitor crossing into this section
			should not have to find the menu button somewhere else. Rendered in
			the trail slot in that case; see below.
		-->
		{#if !siteMenu}
			<button on:click={drawerOpen} class="btn-icon !w-11 xl:!hidden">
				<Fa icon={faBars} />
			</button>
		{/if}
	</svelte:fragment>
	<!-- Logo -->
	{#if siteMenu}
		<!--
			Embedded in another site, the logo and the title go to different
			places: the logo out to the parent site, the title back to this
			app's own home. One anchor around both cannot express that, and the
			two destinations have to be told apart — they used to share the
			title "Aller à l'accueil" while leading to different sites.
		-->
		<!--
			`-ml-2` below xl, where the hamburger has moved to the trail.

			Skeleton renders its lead slot whenever one is passed at all — a
			`<svelte:fragment slot="lead">` counts even when everything inside is
			behind a false `{#if}` — so an empty lead div still takes a grid
			column, and the bar's `gap-2` puts 8px in front of the logo. The logo
			then sat 16px from the left while the hamburger sat 8px from the
			right, and the button looked like it was touching the edge of the
			screen because nothing on the other side was.

			Pulling the logo back by that gap rather than dropping the column:
			the column carries the default slot's own track, and removing it
			moves the logo and title into the trailing one — which put them at
			the far right of the bar with the controls on the left.
		-->
		<div class="flex items-center lg:gap-2 -ml-2 xl:ml-0">
			<a
				data-sveltekit-preload-data="off"
				href={siteMenu.parentSite.url}
				rel="noopener"
				title={m.NAVBAR_GO_PARENT_SITE({ site: siteMenu.parentSite.name })}
				class="flex items-center min-h-11"
			>
				<!--
					width/height rather than `w-auto` alone: this sits in a flex
					row, where an image with no intrinsic width to lay out
					against gets a 0-wide box and disappears — the alt text is
					never shown, the request still succeeds, and the bar simply
					looks like it has no logo. The attributes also give the
					browser the aspect ratio before the file arrives, so the
					row does not reflow around it.
				-->
				<img
					src={siteMenu.parentSite.logo}
					alt={siteMenu.parentSite.logoAlt}
					width="147"
					height="64"
					class="h-8 w-auto max-w-none shrink-0"
				/>
			</a>
			<a
				href="{base}/"
				title={m.NAVBAR_GO_DIRECTORY_HOME()}
				class="flex items-center min-h-11 px-1"
			>
				<span class="block lg:hidden">{m.ADDRESSBOOK_TITLE()}</span>
				<span class="max-lg:hidden"><h4 class="h4">{m.ADDRESSBOOK_TITLE()}</h4></span>
			</a>
		</div>
	{:else}
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
						<Fa style="font-size:2em" icon={faAddressBook} class="align-middle" />
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
	{/if}
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
		<!--
			Dropped where the parent site's menu is in the bar: that menu is how
			this site navigates, and a second dropdown beside it offering a
			different set of destinations is one navigation control too many.
			The links it held are not lost — home and the directory are the two
			anchors at the start of the bar, contact is in the parent's menu and
			in the footer, and the drawer still carries the full rail on mobile.
		-->
		{#if !siteMenu}
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
		{/if}
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
			<!--
				The parent site's menu where there is one, this site's own
				programme menu otherwise. Not both: they are two answers to the
				same question, and a site embedded in another one navigates by
				the parent's structure.
			-->
			{#if siteMenu}
				<ParentSiteNav items={visibleItems()} />
			{:else}
				<MenuNavLinks />
			{/if}
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
		<!--
			The hamburger, at the end of the row, for a site embedded in one that
			places it there. Same 44px floor and the same `xl:!hidden` as the
			copy in the lead slot — only the position differs, and exactly one of
			the two ever renders.
		-->
		{#if siteMenu}
			<button on:click={drawerOpen} class="btn-icon !w-11 xl:!hidden">
				<Fa icon={faBars} />
			</button>
		{/if}
	</svelte:fragment>
</AppBar>
