<script lang="ts">
	import * as m from '$msgs';
	import type { PeerStatus } from './peerStatus.ts';
	import { groupPeers, type Environment, type Peer } from './peerGroups.ts';

	const headings: Record<Environment, () => string> = {
		production: m.CLONE_PEER_GROUP_PRODUCTION,
		staging: m.CLONE_PEER_GROUP_STAGING,
		development: m.CLONE_PEER_GROUP_DEVELOPMENT,
		other: m.CLONE_PEER_GROUP_OTHER
	};

	/** `statuses` is undefined until the peers have been asked, a peer missing from it is still being asked. */
	let {
		instances,
		statuses,
		value = $bindable(''),
		onrecheck = () => {}
	}: {
		instances: Peer[];
		statuses: Record<string, PeerStatus> | undefined;
		value?: string;
		onrecheck?: () => void;
	} = $props();

	const statusOf = (name: string): PeerStatus | undefined => statuses?.[name];
	const anyOffline = $derived(instances.some((i) => statusOf(i.name)?.online === false));

	$effect(() => {
		if (value && statusOf(value)?.online === false) value = '';
	});
</script>

<div class="space-y-2">
	<div class="max-h-[calc(100vh-34rem)] min-h-40 space-y-4 overflow-y-auto pr-2" data-testid="clone-peer-list">
	{#each groupPeers(instances) as group (group.environment)}
		<fieldset class="space-y-2">
			<legend class="h4 pb-1">{headings[group.environment]()}</legend>
			{#each group.peers as i (i.name)}
				{@const status = statusOf(i.name)}
				<label
					class="card flex items-center gap-3 p-2 {status?.online
						? 'cursor-pointer variant-ghost hover:variant-soft-primary'
						: 'opacity-70 variant-ghost'}"
				>
					<input
						class="radio"
						type="radio"
						name="clone-instance"
						value={i.name}
						bind:group={value}
						disabled={!status?.online}
					/>
					<span class="flex-1">{i.label}</span>
					{#if !status}
						<span class="badge text-base variant-soft">{m.CLONE_PEER_CHECKING()}</span>
					{:else if status.online}
						<span class="badge text-base variant-filled-success">{m.CLONE_PEER_ONLINE()}</span>
					{:else}
						<span class="badge text-base variant-filled-error">{m.CLONE_PEER_OFFLINE()}</span>
					{/if}
				</label>
			{/each}
		</fieldset>
	{/each}
	</div>
	{#if anyOffline}
		<p class="text-base opacity-75">{m.CLONE_PEER_OFFLINE_HINT()}</p>
	{/if}
	<button type="button" class="btn variant-ghost" onclick={onrecheck}>
		{m.CLONE_PEER_RECHECK()}
	</button>
</div>
