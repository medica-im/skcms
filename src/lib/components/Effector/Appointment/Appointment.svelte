<script lang="ts">
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faAddressBook } from '@fortawesome/free-regular-svg-icons';
	import { faGlobe, faPhone } from '@fortawesome/free-solid-svg-icons';
	import { faCalendarCheck } from '@fortawesome/free-regular-svg-icons';
	import Put from '$lib/Web/Appointment/Put.svelte';
	import Delete from '$lib/Web/Appointment/Delete.svelte';
	import type { Appointment } from '$lib/interfaces/appointment.interface.ts';

	let { data, editMode }: { data: Appointment; editMode: boolean; } = $props();
</script>
<div class="flex gap-4 items-center">
{#if data.url}
	<a href={data.url} rel="external" class="btn variant-ghost-secondary">
		<span><Fa icon={faGlobe} size="sm" /></span><span>{m.WEBSITE()}</span></a
	>
{:else if data.phone}
	<a href="tel:{data.phone}" rel="external" class="btn variant-ghost-secondary">
		<span><Fa icon={faPhone} size="sm" /></span><span>{data.phone}</span></a
	>
{/if}
{#if editMode}
<Put data={data} /><Delete data={data}/>
{/if}
</div>