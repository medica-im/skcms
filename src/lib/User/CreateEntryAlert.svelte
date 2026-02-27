<script lang="ts">
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import Fa from 'svelte-fa';
	import { faAddressBook, faXmark } from '@fortawesome/free-solid-svg-icons';
	import type { Entry } from '$lib/store/directoryStoreInterface';
	import * as m from '$msgs';

	const user = $derived(page.data.user);
	const entries: Entry[] = $derived(page.data.entries ?? []);
	const hasEntry = $derived(
		user?.uid && entries.some((e: Entry) => e.owner?.includes(user.uid) || e.creator?.includes(user.uid))
	);
	let visible = $state(true);
</script>

{#if user?.uid && !hasEntry && visible}
	<div class="fixed bottom-4 left-2 z-50 max-w-[16rem] sm:top-20 sm:bottom-auto sm:left-auto sm:right-4 sm:max-w-sm" transition:fade={{ duration: 200 }}>
		<aside class="flex flex-row items-center gap-3 rounded-container-token variant-filled-primary shadow-lg p-3 sm:p-4">
			<Fa icon={faAddressBook} size="lg" />
			<a href="/web/entry" class="btn btn-sm variant-filled-secondary">{m.create_entry_cta()}</a>
			<button class="btn-icon btn-icon-sm variant-soft" onclick={() => (visible = false)}>
				<Fa icon={faXmark} />
			</button>
		</aside>
	</div>
{/if}
