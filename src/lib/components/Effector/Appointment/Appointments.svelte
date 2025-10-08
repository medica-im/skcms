<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCalendarCheck } from '@fortawesome/free-regular-svg-icons';
	import Appointment from './Appointment.svelte';
	import { getEditMode, getEntryUid } from '$lib/components/Directory/context.ts';
	import CreateAppointment from '$lib/Web/Appointment/Create.svelte';
	import type { Appointment as AppointmentType } from '$lib/interfaces/appointment.interface';
	const editMode = getEditMode();

	let { data }: { data: AppointmentType[] | null } = $props();

	function filterAppointment(location: string | null) {
		const a = data?.filter((a) => a.location == location);
		return a;
	}
	let appointments = $derived(filterAppointment(null));
	let appointmentsHouseCall = $derived(filterAppointment('house_call'));
	let appointmentsOffice = $derived(filterAppointment('office'));
</script>

<div class="flex items-center p-1">
	<div class="w-9"><Fa icon={faCalendarCheck} size="sm" /></div>
	<div>
		<h3 class="h3 flex place-items-center gap-1">
			{m.ADDRESSBOOK_APPOINTMENT_LABEL()}{#if $editMode}<CreateAppointment />{/if}
		</h3>
	</div>
</div>
{#if data && data?.length}
	<div class="flex items-center">
		<div class="w-9"></div>
		<div class="grid grid-cols-1">
			{#if appointments}
				<div class="space-y-2 py-2">
					{#each appointments as appointment (appointment.uid)}
						<div>
							<Appointment data={appointment} editMode={$editMode} />
						</div>
					{/each}
				</div>
			{/if}
			{#if data.some((a) => a.location == 'house_call')}
				{#if appointmentsHouseCall}
					<div class="">
						<p>Pour des soins à domicile</p>
						<div class="space-y-2 py-2">
							{#each appointmentsHouseCall as appointment (appointment.uid)}
								<div>
									<Appointment data={appointment} editMode={$editMode} />
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
			{#if appointmentsOffice?.length}
				<div class="">
					<p>Pour des soins au cabinet</p>
					<div class="space-y-2 py-2">
						{#each appointmentsOffice as appointment (appointment.uid)}
							<div>
								<Appointment data={appointment} editMode={$editMode} />
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
