<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton';
	import * as m from '$msgs';
	import Phone from '$lib/Directory/Phone/Phone.svelte';
	import Emails from '$lib/Email/Emails.svelte';
	import { avatarSrc } from '$lib/components/Effector/Avatar/avatarUrl.ts';
	import { PUBLIC_URL } from '$lib/utils/appUrl';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';

	let { data }: { data: EntryFull } = $props();
</script>

<div class="card variant-soft p-4 space-y-3">
	<div class="flex items-center gap-4">
		<Avatar
			src={avatarSrc(data.avatar, 'sm', PUBLIC_URL)}
			fallback={avatarSrc(null, 'sm', PUBLIC_URL)}
			alt="{m.ADDRESSBOOK_A11Y_PROFILE_PIC_OF()} {data.name}"
			width="w-16"
		/>
		<div>
			<p class="font-semibold">{data.name}</p>
			<p class="italic">{data.effector_type?.label}</p>
		</div>
	</div>
	<!-- Phone one by one: Phones.svelte reads the entry page's edit-mode context,
	     which a public page does not set. -->
	{#if data.phones?.length}
		<div class="space-y-1">
			{#each data.phones as phone (phone.id)}
				<Phone data={phone} />
			{/each}
		</div>
	{/if}
	{#if data.emails?.length}
		<Emails data={data.emails} />
	{/if}
</div>
