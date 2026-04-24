<script lang="ts">
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import Fa from 'svelte-fa';
	import { faPeopleGroup } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import Membership from '$lib/Membership/Membership.svelte';
	import PatchMembershipModal from '$lib/Web/Entry/Membership/PatchMembershipModal.svelte';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	let { memberships, editMode, uid = '' }: { memberships: Entry[] | null; editMode: boolean; uid?: string } = $props();

	const filteredMemberships = $derived(
		memberships?.filter((e: Entry) => e.uid !== uid) ?? null
	);
</script>

{#if filteredMemberships?.length || editMode}
	<div class="d-flex justify-content-between align-items-start">
		<div class="flex items-center py-2">
			<div class="w-9"><Fa icon={faPeopleGroup} size="sm" /></div>
			<div>
				<h4 class="h4 flex place-items-center gap-1">
					{capitalizeFirstLetter(
						m.MEMBERSHIP({ count: filteredMemberships?.length||0 })
					)}{#if editMode}<PatchMembershipModal currentMemberships={memberships} />{/if}
				</h4>
			</div>
		</div>
		<div class="flex">
			<div class="w-9"></div>
			<div class="py-2">
				{#if filteredMemberships?.length}
					<Membership data={filteredMemberships} />
				{:else}
					Cette entrée n'est membre d'aucune organisation.
				{/if}
			</div>
		</div>
	</div>
{/if}
