<script lang="ts">
	import { variables } from '$src/lib/utils/constants';
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import Directory from '$lib/components/Directory/CtxDirectory.svelte';
	import EntriesTable from '$lib/Web/Entries/EntriesTable.svelte';
	import type { AdminEntry } from '$lib/Web/Entries/entriesTable';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The endpoint refuses anyone below administrator, so this only decides
	// what the page says — it is not the access control. A viewer arriving
	// without the role sees the refusal rather than an empty table, which
	// would read as an empty directory.
	const isAuthorized = $derived(
		page.data?.user?.role === 'superuser' || page.data?.user?.role === 'administrator'
	);

	// One payload, two uses. /admin/entries carries the commune, department,
	// effector type, facility and tags the selectors filter on, alongside the
	// creator, owner and deactivation fields only this page shows — so the
	// selectors and the table read the same rows.
	//
	// A separate endpoint from the public feed, which would have served this
	// page's data perfectly well — an administrator sees every access level
	// and a superuser is not filtered at all. The reasons are the other two:
	// the public feed is cached per role for an hour, and an audit table
	// showing hour-old ownership misleads the person reading it; and adding
	// creator and owner names to a payload anonymous visitors can fetch puts
	// them one scrub-list omission away from being published.
	//
	// The map keyed by uid is what turns a filtered row back into its
	// administrative form.
	const adminByUid = $derived(
		new Map((data.entries ?? []).map((e: AdminEntry) => [e.uid, e]))
	);

	const toAdmin = (filtered: any[]): AdminEntry[] =>
		filtered.map((e) => adminByUid.get(e.uid)).filter((e): e is AdminEntry => e !== undefined);
</script>

<svelte:head>
	<title>
		{m.admin_entries_title()} - {capitalizeFirstLetter(
			page.data.organization.formatted_name,
			variables.DEFAULT_LANGUAGE
		)}
	</title>
</svelte:head>

<header id="hero" class="hero-gradient">
	<div class="flex flex-col items-center p-4 py-6 space-y-2">
		<h2 class="h2">{m.admin_entries_title()}</h2>
		<p class="opacity-70 text-sm">{m.admin_entries_subtitle()}</p>
	</div>
</header>

{#if !isAuthorized}
	<div class="section-container">
		<aside class="alert variant-ghost-error"><div class="alert-message"><p>403</p></div></aside>
	</div>
{:else if data.entries === undefined}
	<!-- The loader logged the reason; an empty table here would be a lie. -->
	<div class="section-container">
		<aside class="alert variant-ghost-warning">
			<div class="alert-message"><p>{m.admin_entries_none()}</p></div>
		</aside>
	</div>
{:else}
	<!-- The same selectors as the public addressbook — search, type, commune,
	     facility, tags — over the same filtering pipeline. Only the view
	     differs: a table instead of cards grouped by type. `active={null}`
	     keeps the inactive entries, which is the point of this page.

	     No map: displaySelector and geojson are left at their defaults, and
	     the results snippet replaces the card list that would have carried
	     them. -->
	<Directory
		data={data.entries}
		propCurrentOrg={null}
		displayCommune={true}
		displayGeocoder={false}
		displayCategory={true}
		displaySituation={false}
		avatar={false}
		setRedirect={false}
		active={null}
		results={tableResults}
	/>
{/if}

{#snippet tableResults(filtered: any[])}
	<EntriesTable entries={toAdmin(filtered)} />
{/snippet}

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-7xl p-4 py-8 md:py-10;
	}
	/* prettier-ignore */
	.hero-gradient {
		background-image:
			radial-gradient(at 0% 0%, rgba(var(--color-secondary-500) / 0.33) 0px, transparent 50%),
			radial-gradient(at 98% 1%, rgba(var(--color-error-500) / 0.33) 0px, transparent 50%);
	}
</style>
