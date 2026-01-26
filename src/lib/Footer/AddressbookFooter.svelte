<script lang="ts">
	import { page } from '$app/state';
	import { getLocale } from "$prgld/runtime.js";
	import * as m from "$msgs";
	import { variables } from '$lib/utils/constants';
	import SocialNetworks from '../SoMed/SoMed.svelte';
	import BlogIconLink from '$lib/Ghost/BlogIconLink.svelte';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
</script>

<footer class="page-footer text-xs md:text-base">
	<div class="w-full max-w-7xl mx-auto p-4 py-16 md:py-24 space-y-10">
		<!-- Row 1 -->
		<div class="md:flex md:justify-between">
			<div class="mb-6 md:mb-0">
				<a data-sveltekit-preload-data="off" href="/" title={m.NAVBAR_GO_HOME()}>
					<div class="flex space-x-2 lg:space-x-4">
						<span class="flex w-8 h-8 lg:w-12 lg:h-12"></span>
                        <div>
						<h4 class="h4">
							{capitalizeFirstLetter(page.data.organization.formatted_name, getLocale())}
						</h4>
						<p>{page.data.organization.contact.address.street}</p>
						<p>{page.data.organization.city.name}</p>
					</div>
					</div>
				</a>
			</div>
			<div class="grid grid-cols-2 gap-8 sm:gap-6 sm:grid-cols-3">
				<div>
					<h6 class="mb-6 text-sm font-semibold uppercase">
						{capitalizeFirstLetter(m.RESOURCES(), getLocale())}
					</h6>
					<ul class="font-medium">
						<!--li class="mb-4">
							<a data-sveltekit-preload-data="off" href="/">
								{m.HOME_TITLE()}
							</a>
						</li-->
						<li class="mb-4">
							<a href="/">{m.ADDRESSBOOK_TITLE()}</a>
						</li>
						<!--li class="mb-4">
							<a href="/sites"> Sites </a>
						</li-->
						<li class="mb-4">
							<a href="/contact"> Contact </a>
						</li>
					</ul>
				</div>
				<div>
					<h6 class="mb-6 text-sm font-semibold uppercase">
						{capitalizeFirstLetter(m.LEGAL(), variables.DEFAULT_LANGUAGE)}
					</h6>
					<ul class="font-medium">
						<!--li class="mb-4">
							<a href="/politique-de-confidentialite" class="hover:underline"
								>{capitalizeFirstLetter(m.PRIVACY_POLICY(), variables.DEFAULT_LANGUAGE)}</a
							>
						</li-->
						<li class="mb-4">
							<a href="/mentions-legales" class="hover:underline"
								>{capitalizeFirstLetter(m.LEGAL_NOTICES(), variables.DEFAULT_LANGUAGE)}</a
							>
						</li>
					</ul>
				</div>
			</div>
		</div>
		<hr class="my-6 sm:mx-auto lg:my-8 !border-t-2" />
		<!-- Row 2 -->
		<div class="flex justify-between items-center">
			<div class="text-sm"
				>© {new Date().getFullYear()} <a href="/" class="hover:underline">{page.data.organization.company_name}</a>.
		</div>
			<div class="flex space-x-6 justify-center">
				{#if page.data.organization?.contact?.socialnetworks}
				<SocialNetworks data={page.data.organization.contact.socialnetworks} appBar={true} />
				{/if}
				{#if variables.BLOG_URI}
				<BlogIconLink />
				{/if}
			</div>
		</div>
		<hr class="my-6 sm:mx-auto lg:my-8 !border-t-2" />
		<!-- Row 3 -->
		<div class="sm:flex sm:items-center sm:justify-between">
			<span class="text-sm sm:text-center"
				>Site propulsé par la solution Pluripro Web créée par <a href="https://medecinelibre.com" class="anchor">Médecine Libre</a>.
			</span>
			<!--div class="flex mt-4 space-x-6 sm:justify-center sm:mt-0">
				<SocialNetworks data={page.data.organization.contact.socialnetworks} appBar={true} />
				<BlogIconLink />
			</div-->
		</div>
	</div>
</footer>

<style lang="postcss">
	a {
		@apply !no-underline;
	}
</style>
