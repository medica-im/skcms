<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faQuestion, faXmark } from '@fortawesome/free-solid-svg-icons';
	import UnknownEmail from '$lib/Auth/UnknownEmail.svelte';
	import { emojis } from '$lib/Error/error';
	import { base } from '$app/paths';

	let visible: boolean = $state(true);
	let session = $derived(page.data.session);
	// A suspended user has no role — that is what suspension does — but is not
	// unknown, so the "we do not recognise your email" wording is wrong for
	// them here for the same reason it is wrong on the dashboard. They are
	// shown the ordinary error instead, which at least does not misdirect.
	const unknownRole = $derived(!page.data?.user?.role && !page.data?.user?.suspended);
</script>

<section class="section-container">
	{#if page.error}
		{#if unknownRole && visible}
			<aside class="alert variant-ghost">
				<div><Fa style="font-size:3em" icon={faQuestion} /></div>
				<UnknownEmail {session} />
				<div class="alert-actions">
					<button
						onclick={() => {
							visible = false;
						}}
						class="btn-icon"><Fa style="font-size:2em" icon={faXmark} /></button
					>
				</div>
			</aside>
		{:else}
			<div class="card variant-ghost p-6 space-y-4">
				<h1 class="h1">{m.ERROR()} {page.status}</h1>
				<p>{page.error.message}</p>
				<p class="text-6xl">{emojis[page.status as keyof object] ?? emojis[500]}</p>
			</div>
		{/if}
		<div class="flex gap-4 mt-6">
			<a href="{base}/" title={m.ADDRESSBOOK_TITLE()} class="btn variant-ghost-primary">{m.ADDRESSBOOK_TITLE()}</a>
			<a href="{base}/contact" title="Contact" class="btn variant-ghost-primary">Contact</a>
		</div>
	{/if}
</section>

<style lang="postcss">
	.section-container {
		@apply mx-auto flex flex-col w-full max-w-7xl items-center justify-center p-4 py-8;
	}
</style>
