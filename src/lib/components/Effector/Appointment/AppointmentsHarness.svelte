<script lang="ts">
	import { writable } from 'svelte/store';
	import { setContext } from 'svelte';
	import Appointments from './Appointments.svelte';
	import type { Appointment as AppointmentType } from '$lib/interfaces/appointment.interface';

	// Appointments reads editMode and entryUid from context rather than props,
	// so a test cannot render it directly. This supplies both.
	let { data, editMode = false }: { data: AppointmentType[] | null; editMode?: boolean } =
		$props();

	setContext('editMode', writable(editMode));
	setContext('entryUid', 'entry-uid-1');
</script>

<Appointments {data} />
