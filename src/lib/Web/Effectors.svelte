<script lang="ts">
	import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
	import * as m from '$msgs';
	import { Avatar } from '@skeletonlabs/skeleton';
	import { faUser } from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
	import type { Effector } from '$lib/interfaces/v2/effector';

	let { effectorType, facility }: { effectorType: string; facility: string } = $props();

	async function getEffectors() {
		const url = `${ORIGIN}/api/v2/effectors?facility=${facility}&effector_type=${effectorType}`;
		const response = await fetch(url);
		const data = (await response.json()) as Effector[];
		return data;
	}
</script>

{#await getEffectors()}
	<span>{m.LOADING}</span>
{:then data}
	{@const count = data.length}
	{#if count}
		<div class="grid grid-cols-1 gap-4 w-full variant-ringed p-4">
			<p>{count} personne{count > 1 ? 's' : ''} de cette catégorie dans cet établissement:</p>
			<div class="flex flex-wrap gap-4">
				{#each data as effector}
					<a href="/" class="anchor">
						<div class="btn variant-ghost p-2 w-min">
							<Avatar src="" width="w-10">
								<Fa icon={faUser} />
							</Avatar>
							<div>{effector.name_fr}</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}
{:catch error}
	<span>{m.ERROR}: {error.message}</span>
{/await}
