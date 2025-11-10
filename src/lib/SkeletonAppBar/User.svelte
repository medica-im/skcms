<script lang="ts">
	import * as m from "$msgs";
	import { page } from '$app/state';
	import { SignOut } from "@auth/sveltekit/components"
	import { logOutUser } from '$lib/utils/requestUtils';
	import { getDrawerStore } from '@skeletonlabs/skeleton';
	import { popup } from '@skeletonlabs/skeleton';
	import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
    import type { OauthSession } from "$lib/interfaces/oidc";

	import Fa from 'svelte-fa';
	import {
		faBars,
		faInfo,
		faTimeline,
		faBookMedical,
		faHouse,
		faMapLocationDot,
		faAddressBook,
		faEnvelope,
		faBlog,
		faRightToBracket,
		faRightFromBracket,
		faUserPlus,
		faUser,
		faHexagonNodes
	} from '@fortawesome/free-solid-svg-icons';
	let { embedded = false, sideBar = false} : { embedded?: boolean; sideBar?: boolean } = $props();
	const drawerStore = getDrawerStore();

	// ListItem Click Handler
	function onListItemClick(): void {
		// On Drawer embed Only:
		if (!embedded) return;
		drawerStore.close();
	}
    let session = $derived(page.data.session);

	let signin = "/signin";
	let classesActive = $derived((href: string) => {
		return page.url.pathname == href ? '!bg-primary-500' : '';
	});

	//let classesActive = (href: string) => (href === page.url.pathname ? '!bg-primary-500' : '');
</script>

{#if sideBar}
	<ul class="navbar-nav">
		{#if session}
			<li class="nav-item">
				<a
					href="/dashboard"
					class={classesActive("/dashboard")}
					><span class="hidden 2xl:inline-block"><Fa icon={faUser} size="lg" /></span><span class="2xl:hidden"><Fa icon={faUser} size="xs" /></span>
					<span>{m.NAVBAR_HI()} {session.user.name}</span></a
				>
			</li>
			<li class="nav-item">
				<button type="button" onclick={async () => await logOutUser()}
					><span class="hidden 2xl:inline-block"><Fa icon={faRightFromBracket} size="lg" /></span><span class="2xl:hidden"><Fa icon={faRightFromBracket} size="xs" /></span>
					<span>{m.NAVBAR_LOGOUT()}</span></button
				>
				<!--a class="nav-link" href="#" on:click={async () => await logOutUser()}
				>{m.NAVBAR_LOGOUT()}</a
            -->
			</li>
		{:else}
			<li class="nav-item">
				<a class={classesActive(signin)} href={signin}
					><span><Fa icon={faRightToBracket} size="lg" /></span>
					<span>{m.NAVBAR_LOGIN()}</span></a
				>
			</li>
			{#if page.data.facility.registration === true}
				<li>
					<a
						class={page.url.pathname === '/accounts/register' ? 'active aria-current="page"' : ''}
						href="/accounts/register">{m.NAVBAR_REGISTER()}</a
					>
				</li>
			{/if}
		{/if}
	</ul>
{:else}
	{#if session?.user}
	<div class="flex flex-wrap gap-0">
		<button
		    use:popup={{ event: 'click', target: 'user' }}
			title={session.user.name}
			class="{classesActive('/dashboard'
			)} btn btn-sm hover:variant-soft-primary"
			><span class="hidden lg:inline-block align-text-bottom"><Fa icon={faUser} size="lg" /></span><span class="lg:hidden"><Fa icon={faUser} size="sm" /></span>
			<span class="hidden lg:inline-block">{session.user.name}</span>
			<span class="opacity-50"><Fa icon={faCaretDown} /></span>
			</button
		>
        <SignOut className="">
          <div
            slot="submitButton"
            class="btn btn-sm hover:variant-soft-primary lg:inline-block"
          >
            <span class="hidden lg:inline-block align-text-bottom"
				><Fa icon={faRightFromBracket} size="lg" /></span
			><span class="lg:hidden align-text-bottom"
				><Fa icon={faRightFromBracket} size="sm" /></span
			>
			<span class="hidden lg:inline-block">{m.NAVBAR_LOGOUT()}</span>
          </div>
        </SignOut>
		<div class="">
			<!-- popup -->
			<!-- prettier-ignore -->
			<div class="card p-4 w-60 shadow-xl" data-popup="user">
			<nav class="list-nav">
				<ul>

					<li>
						<a href="/dashboard"
						title={session.user.name}
						>
							<span class="w-6 text-center"><Fa icon={faUser} /></span>
							<span>{session.user.name}</span>
						</a>
						<a href="/web/guide-utilisation">
							<span class="w-6 text-center"><Fa icon={faHexagonNodes} /></span>
							<span>Guide d'utilisation</span>
						</a>
						<a href="/web">
							<span class="w-6 text-center"><Fa icon={faHexagonNodes} /></span>
							<span>Créer une entrée</span>
						</a>
						<!--hr class="my-4"-->
						<!--a href="/{ facility.category.slug }/projet-de-sante">
							<span class="w-6 text-center"><Fa icon={faBookMedical} /></span>
							<span>{m.NAVBAR_HEALTH_PROJECT()}</span>
						</a-->
					</li>
				</ul>
			</nav>
		</div>
		</div>
		</div>
	{:else}
		<a
			class="{classesActive(signin)} btn btn-sm lg:btn-md hover:variant-soft-primary lg:inline-block"
			href={signin}
			title={m.NAVBAR_LOGIN()}
			><span class="hidden lg:inline-block align-text-bottom"
				><Fa icon={faRightToBracket} size="lg" /></span
			><span class="lg:hidden align-text-bottom"
				><Fa icon={faRightToBracket} size="sm" /></span
			>
			<span class="hidden xl:inline-block">{m.NAVBAR_LOGIN()}</span></a
		>
	{/if}
{/if}
