<script lang="ts">
	import { variables } from '$src/lib/utils/constants';
	import { page } from '$app/state';
	import * as m from '$msgs';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import Directory from '$lib/components/Directory/CtxDirectory.svelte';
	import EntriesTable from '$lib/Web/Entries/EntriesTable.svelte';
	import { mergeAdmin, type AdminEntry, type AdminFields } from '$lib/Web/Entries/entriesTable';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The endpoint refuses anyone below administrator, so this only decides
	// what the page says — it is not the access control. A viewer arriving
	// without the role sees the refusal rather than an empty table, which
	// would read as an empty directory.
	const isAuthorized = $derived(
		page.data?.user?.role === 'superuser' || page.data?.user?.role === 'administrator'
	);

	// Two sources, joined by uid.
	//
	// The selectors filter page.data.entries — the cached payload the root
	// layout already fetched, which for an administrator is every entry, since
	// access filtering does not apply above staff. That cache is what keeps
	// the rest of the site fast for them, so this page reads it rather than
	// asking for the same rows again.
	//
	// /admin/entries adds only what that payload lacks: the creation date, the
	// contact timestamp, why an entry was deactivated, and the names behind
	// the creator and owner uids. It is uncached — five people use it — and
	// separate because deactivation reasons and maintainer names have no place
	// in a response anonymous visitors can fetch.
	const adminByUid = $derived(
		new Map((data.adminFields ?? []).map((f: AdminFields) => [f.uid, f]))
	);

	const rows = (filtered: any[]): AdminEntry[] =>
		filtered.map((e) => mergeAdmin(e, adminByUid.get(e.uid)));
</script>

<svelte:head>
	<title>
		{m.admin_entries_title()} - {capitalizeFirstLetter(
			page.data.organization.formatted_name,
			variables.DEFAULT_LANGUAGE
		)}
	</title>
</svelte:head>

<!--
	No background of its own: Wintry already paints a gradient at the top of the
	viewport, and a band repeating those colours in its own box drew them twice
	at two scales, leaving a seam where it ended.
-->
<header id="hero">
	<div class="flex flex-col items-center p-4 py-6 space-y-2">
		<h2 class="h2">{m.admin_entries_title()}</h2>
		<p class="opacity-70 text-sm">{m.admin_entries_subtitle()}</p>
	</div>
</header>

{#if !isAuthorized}
	<div class="section-container">
		<aside class="alert variant-ghost-error"><div class="alert-message"><p>403</p></div></aside>
	</div>
{:else if data.adminFields === undefined}
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
		data={page.data.entries}
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
	<EntriesTable entries={rows(filtered)} />
{/snippet}

<style lang="postcss">
	.section-container {
		@apply mx-auto w-full max-w-7xl p-4 py-8 md:py-10;
	}
</style>
