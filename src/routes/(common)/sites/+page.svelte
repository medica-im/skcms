<script lang="ts">
	import { variables } from '$src/lib/utils/constants';
	import { MultipleIntersectionObserver } from 'svelte-intersection-observer';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	
	import { page } from '$app/state';
	import FacilityCard from '$lib/Facility/FacilityCard.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { FacilityIntersect } from '$src/lib/interfaces/facility.interface';
	import type { Address, Avatar } from '$lib/interfaces/facility.interface';
	import type { SocialNetwork } from '$lib/interfaces/socialnetwork.interface';
	import type { Website } from '$lib/interfaces/website.interface';
	import type { Email } from '$lib/interfaces/email.interface.ts';
	import type { Phone } from '$lib/interfaces/phone.interface';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	class FacilityIntersectCls {
		uid: string;
		address: Address;
		ban_banId: string | null;
		ban_id: string | null;
		commune: string;
		name: string;
		label: string;
		organizations: any[];
		resource_uri: string;
		slug: string;
		socialnetworks: SocialNetwork[] | null;
		websites: Website[] | null;
		avatar: Avatar | null;
		emails: Email[] | null;
		phones: Phone[] | null;
		entries: string[];
		htmlElement = $state(null);
		constructor(
			uid: string,
			address: Address,
			ban_banId: string | null,
			ban_id: string | null,
			commune: string,
			name: string,
			label: string,
			organizations: any,
			resource_uri: string,
			slug: string,
			socialnetworks: SocialNetwork[] | null,
			websites: Website[] | null,
			avatar: Avatar | null,
			emails: Email[] | null,
			phones: Phone[] | null,
			entries: string[]
		) {
			this.uid = uid;
			this.address = address;
			this.ban_banId = ban_banId;
			this.ban_id = ban_id;
			this.commune = commune;
			this.name = name;
			this.label = label;
			this.organizations = organizations;
			this.resource_uri = resource_uri;
			this.slug = slug;
			this.socialnetworks = socialnetworks;
			this.websites = websites;
			this.avatar = avatar;
			this.emails = emails;
			this.phones = phones;
			this.entries = entries;
			this.htmlElement = this.htmlElement;
		}
	}

	const count = $derived(data.facilities.length);

	const facilities: FacilityIntersect[] = $derived(
		data.facilities.map((f) => {
			let fi = new FacilityIntersectCls(
				f.uid,
				f.address,
				f.ban_banId,
				f.ban_id,
				f.commune,
				f.name,
				f.label,
				f.organizations,
				f.resource_uri,
				f.slug,
				f.socialnetworks,
				f.websites,
				f.avatar,
				f.emails,
				f.phones,
				f.entries
			);
			return fi;
		})
	);
	const htmlElements = $derived(facilities.map((f) => f.htmlElement));
	let intersecting: SvelteSet<string> = new SvelteSet();
	$inspect(intersecting);

	function getEntries(uid: string) {
		return data.entryMap.get(uid);
	}

	const getHeader = () => {
		return count < 2 ? 'Notre établissement' : `Nos ${count} établissements`;
	};
	const getTitle = () => {
		return count < 2 ? 'Établissement' : 'Établissements';
	};
</script>

<svelte:head>
	<title>
		{getTitle()} - {capitalizeFirstLetter(page.data.organization.formatted_name, variables.DEFAULT_LANGUAGE)}
	</title>
</svelte:head>
<header id="hero" class="bg-surface-100-800-token hero-gradient">
	<div class="section-container">
		<h2 class="h2">
			{getHeader()}
		</h2>
	</div>
</header>

<div>
	<!-- programs -->
	<section id="programs" class="bg-surface-100-800-token programs-gradient">
		<div class="section-container">
			<div class="lg:hidden logo-cloud grid-cols-1 gap-0.5">
				{#each data.facilities as facility}
					<a href="#{facility.name}_anchor" class="logo-item p-2">{facility.name}</a>
				{/each}
			</div>
			<div class="grid lg:grid-cols-2 gap-6">
				<MultipleIntersectionObserver
					elements={htmlElements}
					let:elementIntersections
					on:intersect={(e) => {
						console.log(e.detail); // IntersectionObserverEntry
						console.log(e.detail.entry.isIntersecting); // true
						console.log(JSON.stringify(e.detail.target.id))
						if (e.detail.entry.isIntersecting) {
							intersecting.add(e.detail.target.id)
						}
					}}
				>
					{#each facilities as facility}
						<div bind:this={facility['htmlElement']} id={facility.uid}>
							<FacilityCard {facility} entries={getEntries(facility.uid)} {intersecting} />
						</div>
					{/each}
				</MultipleIntersectionObserver>
			</div>
		</div>
	</section>
</div>

<style lang="postcss">
	.section-container {
		@apply mx-auto flex w-full max-w-7xl justify-center space-y-6 px-6 py-6 md:py-8;
	}
	/* Hero Gradient */
	/* prettier-ignore */
	.hero-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 98% 1%, rgba(var(--color-error-500) / 0.33) 0px, transparent 50%);
	}
	/* Team Gradient */
	/* prettier-ignore */
	.team-gradient {
		background-image:
			radial-gradient(at 0% 100%, rgba(var(--color-secondary-500) / 0.50) 0px, transparent 50%);
	}
	/* Tailwind Gradient */
	/* prettier-ignore */
	.tailwind-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.50) 0px, transparent 50%),
			radial-gradient(at 100% 100%,  rgba(var(--color-primary-500) / 0.24) 0px, transparent 50%);
	}
	/* Programs Gradient */
	/* prettier-ignore */
	.programs-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 100% 0%,  rgba(var(--color-primary-500) / 0.33) 0px, transparent 50%);
	}
</style>
