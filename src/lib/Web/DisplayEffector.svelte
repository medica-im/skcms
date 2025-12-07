<script lang="ts">
	import { PUBLIC_ORIGIN as ORIGIN } from '$env/static/public';
	import type { Effector } from '$lib/interfaces/v2/effector';
	let { effectorUid }: { effectorUid: string | undefined } = $props();
	async function fetchEffector(): Promise<Effector | number> {
		const response = await fetch(`${ORIGIN}/api/v2/effectors/${effectorUid}`);
		if (response.ok) {
			return await response.json();
		} else {
			return response.status;
		}
	}
</script>

{#if effectorUid}
	{#await fetchEffector()}
		<!-- promise is pending -->
		<div class="card p-4 grid grid-cols-1">
				<h4 class="h4">Nom</h4>
				<ul>
					<li>Label <div class="placeholder"></div></li>
					<li>Slug <div class="placeholder"></div></li>
					<li>Genre grammatical <div class="placeholder"></div></li>
				</ul>
			</div>
	{:then value}
		{#if typeof value == 'number'}
        {@const status = value}
			<p>Erreur {status}</p>
		{:else}
        {@const effector = value }
			<div class="card p-4 grid grid-cols-1">
				<h4 class="h4">{effector.name_fr}</h4>
				<ul class="list">
					<li>Label {effector.label_fr}</li>
					<li>Slug {effector.slug_fr}</li>
					<li>Genre grammatical {effector.gender}</li>
				</ul>
			</div>
		{/if}
	{:catch error}
		<!-- promise was rejected -->
		<p>Erreur {error.message}</p>
	{/await}
{/if}
