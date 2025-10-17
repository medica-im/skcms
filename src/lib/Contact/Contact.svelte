<script lang="ts">
	import { MapLibre as Map } from '$lib';
	import { page } from '$app/state';
	import Fa from 'svelte-fa';
	import Address from '$lib/Address/Address.svelte';
	import { createMapData } from '$lib/components/Map/mapData';
	import Phones from '$lib/Directory/Phone/Phones.svelte';
	import Emails from '$lib/Email/Emails.svelte';
	import { faLocationDot } from '@fortawesome/free-solid-svg-icons';
</script>

<div class="grid lg:grid-cols-2">
	<div class="grow-0 basis-auto lg:w-6/12 xl:w-8/12">
		<div class="flex flex-wrap pt-12 lg:pt-0">
			<div
				class="mb-12 grow-0 shrink-0 basis-auto w-full md:w-6/12 lg:w-full xl:w-6/12 px-3 md:px-6 xl:px-12"
			>
				<div class="flex items-start">
					<div class="shrink-0 hidden lg:block">
						<div
							class="p-4 bg-primary-500 rounded-md shadow-md w-14 h-14 flex items-center justify-center"
						>
							<Fa icon={faLocationDot} size="2x" />
						</div>
					</div>
					<div class="ml-6">
						<p class="font-bold mb-1">Siège social</p>
						<Address data={page.data.organization.contact} />
						{#if page.data.organization.contact.phonenumbers}
							<Phones data={page.data.organization.contact.phonenumbers} />
						{/if}
						{#if page.data.organization.contact.emails}
							<Emails data={page.data.organization.contact.emails} />
						{/if}
						{#if page.data.organization.logo}
							<img
								class="rounded-lg py-4 max-w-80"
								src={page.data.organization.logo}
								alt={page.data.organization.logo_alt}
							/>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="justify-stretch justify-items-stretch h-80 lg:h-full p-2">
		<Map
			data={createMapData(
				page.data.organization.contact.address,
				page.data.organization.formatted_name
			)}
		/>
	</div>
</div>
