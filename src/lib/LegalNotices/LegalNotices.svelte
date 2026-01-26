<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { variables } from '$src/lib/utils/constants';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import LegalEntity from '$lib/components/LegalEntity/LegalEntity.svelte';
	import Address from '$lib/Address/Address.svelte';
	import Fa from 'svelte-fa';
	import { faBuilding, faLocationDot, faServer } from '@fortawesome/free-solid-svg-icons';
</script>

<header>
	<div class="section-container">
		<h2 class="h2">{capitalizeFirstLetter(m.LEGAL_NOTICES(), variables.DEFAULT_LANGUAGE)}</h2>
	</div>
</header>
<section>
	<div class="section-container">
		<div class="flex flex-wrap">
			<div class="mb-12 basis-auto w-full md:w-6/12 lg:w-full xl:w-6/12 px-3 md:px-6 xl:px-12">
				<div class="flex items-start">
					<div class="shrink-0">
						<div
							class="p-4 bg-primary-500 rounded-md shadow-md w-14 h-14 flex items-center justify-center"
						>
							<Fa icon={faBuilding} size="2x" />
						</div>
					</div>
					<div class="grow ml-6">
						<p class="font-bold mb-1">Informations légales</p>
						<LegalEntity data={page.data.organization.legal_entity} />
					</div>
				</div>
			</div>
			<div class="mb-12 basis-auto w-full md:w-6/12 lg:w-full xl:w-6/12 px-3 md:px-6 xl:px-12">
				<div class="flex items-start">
					<div class="shrink-0">
						<div
							class="p-4 bg-primary-500 rounded-md shadow-md w-14 h-14 flex items-center justify-center"
						>
							<Fa icon={faLocationDot} size="2x" />
						</div>
					</div>
					<div class="grow ml-6">
						<p class="font-bold mb-1">Siège social</p>
						<Address data={page.data.organization.contact} />
					</div>
				</div>
			</div>
			<div
				class="mb-12 lg:mb-0 basis-auto w-full md:w-6/12 lg:w-full xl:w-6/12 px-3 md:px-6 xl:px-12"
			>
				<div class="flex align-start">
					<div class="shrink-0">
						<div
							class="p-4 bg-primary-500 rounded-md shadow-md w-14 h-14 flex items-center justify-center"
						>
							<Fa icon={faServer} size="2x" />
						</div>
					</div>
					<div class="grow ml-6">
						<p class="font-bold mb-1">Hébergeur</p>
						<p>DigitalOcean, LLC</p>
						<p class="text-sm">
							101 Avenue of the Americas<br />
							10th Floor<br />
							New York<br />
							NY 10013<br />
							United States of America<br />
							+1 234-567-89
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-7xl p-4 py-8 md:py-12;
	}
</style>
