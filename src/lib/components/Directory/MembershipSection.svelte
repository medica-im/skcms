<script lang="ts">
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import Fa from 'svelte-fa';
	import { faPeopleGroup } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';
	import Membership from '$lib/Membership/Membership.svelte';
	import PatchMembershipModal from '$lib/Web/Entry/Membership/PatchMembershipModal.svelte';
	import type { Entry } from '$lib/store/directoryStoreInterface';

	let { memberships, editMode }: { memberships: Entry[] | null; editMode: boolean } = $props();
</script>

{#if memberships?.length || editMode}
	<div class="d-flex justify-content-between align-items-start">
		<div class="flex items-center py-2">
			<div class="w-9"><Fa icon={faPeopleGroup} size="sm" /></div>
			<div>
				<h4 class="h4 flex place-items-center gap-1">
					{capitalizeFirstLetter(
						m.MEMBERSHIP({ count: memberships?.length||0 })
					)}{#if editMode}<PatchMembershipModal currentMemberships={memberships} />{/if}
				</h4>
			</div>
		</div>
		<div class="flex">
			<div class="w-9"></div>
			<div class="py-2">
				{#if memberships}
					<Membership data={memberships} />
				{:else}
					Cette entrée n'est membre d'aucune organisation.
				{/if}
			</div>
		</div>
	</div>
{/if}
