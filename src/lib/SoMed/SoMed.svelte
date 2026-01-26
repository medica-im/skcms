<script lang="ts">
	import { AppRailAnchor } from '@skeletonlabs/skeleton';
	import Fa from 'svelte-fa';
	import {
		faXTwitter,
		faFacebook,
		faLinkedin,
		faInstagram,
		faYoutube,
		faSkype
	} from '@fortawesome/free-brands-svg-icons';
	import { getDrawerStore } from '@skeletonlabs/skeleton';
	import Update from '$lib/Web/SocialMedia/Update.svelte';
	import Delete from '$lib/Web/SocialMedia/Delete.svelte';
	import type { SocialNetwork } from '$lib/interfaces/socialnetwork.interface';
	let {
		embedded = false,
		data,
		appBar = false,
		appRail = false,
		editMode = false,
	} : {
		embedded?: boolean;
		data: SocialNetwork[];
		appBar?: boolean;
		appRail?: boolean;
		editMode?: boolean;
	} = $props();

	const drawerStore = getDrawerStore();

	// ListItem Click Handler
	function onListItemClick(): void {
		// On Drawer embed Only:
		if (!embedded) return;
		drawerStore.close();
	}

	function onClickAnchor(): void {
		//currentRailCategory = undefined;
		drawerStore.close();
	}

	/*
    function ulClasses() {
        if (isNavbar) {
            return "navbar-nav d-flex flex-row"
        } else {
            return "list-group list-group-flush list-group-horizontal"
        }
    }
    function liClasses() {
        if (isNavbar) {
            return "nav-item"
        } else {
            return "list-group-item border-0"
        }
    }
	
    function hasSoMed(somed) {
		return data.some((e) => e.type == somed);
	}
	
    function getUrl(somed) {
		var element = data.find((e) => e.type == type);
		return element.url;
	}
    */
	function getIcon(somed: SocialNetwork) {
		let type: string = somed.type;
		const icons = {
			T: faXTwitter,
			F: faFacebook,
			LI: faLinkedin,
			I: faInstagram,
			YT: faYoutube,
			S: faSkype
		};
		return icons[type as keyof typeof icons];
	}
</script>

{#if appBar}
	{#each data as somed}
		<a
			href={somed.url}
			title={somed.type_display}
			class="btn-icon btn-icon-sm hover:variant-soft-secondary"
			target="_blank"
			rel="external"
		>
			<span><Fa icon={getIcon(somed)} size="lg" /></span>
		</a>
	{/each}
{:else if appRail}
	{#each data as somed}
	<AppRailAnchor
	href={somed.url}
	rel="external"
	class="lg:hidden"
	on:click={() => {
		onClickAnchor();
	}}
>
	<svelte:fragment slot="lead"><Fa icon={getIcon(somed)} size="lg" class="inline-block outline-none" /></svelte:fragment>
	<span>{somed.type_display}</span>
</AppRailAnchor>
	{/each}
{:else}
<span class="align-middle space-x-2">
	{#each data as somed}
		<a
            href={somed.url}
            title={somed.type_display}
            class="btn-icon variant-ghost-secondary"
            target="_blank"
            rel="external">
			<span><Fa icon={getIcon(somed)} size="lg" /></span>
		</a>{#if editMode}<Update data={somed} /><Delete data={somed}/>{/if}
	{/each}
</span>
{/if}
