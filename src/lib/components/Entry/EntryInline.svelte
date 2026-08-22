<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { Avatar } from '@skeletonlabs/skeleton';
	import { faUser } from '@fortawesome/free-solid-svg-icons';
	import { entrySlugPageUrl } from '$lib/utils/utils.ts';
	import Fa from 'svelte-fa';
	import type { Entry, EntryFull } from '$lib/store/directoryStoreInterface';

	// Prefix only a path that exists. An entry without a picture yields
	// undefined from every branch above, and `${base}${undefined}` is the
	// STRING "/annuaireundefined" — a src the browser dutifully requests and
	// 404s on. Returning undefined keeps the original behaviour, which the
	// Avatar component already handles by showing its own fallback.
	const avatarPath = (p: string | undefined) => (p ? `${base}${p}` : undefined);

	let {data} : {data: EntryFull} = $props();
	const _entry: Entry = page.data.entries.find((e: Entry)=>e.uid==data.uid);
</script>

{#if data && _entry}
	<a href={entrySlugPageUrl(_entry)} class="anchor">
		<div class="flex flex-wrap gap-2 items-center">
			<Avatar src={avatarPath(data?.avatar?.sm||data?.avatar?.raw)} width="w-10">
				<Fa icon={faUser} />
			</Avatar>
			<div>{data?.name}, {data?.effector_type.label}</div>
		</div>
	</a>
{:else}
	data: {JSON.stringify(data)}
{/if}
