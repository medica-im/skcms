<script lang="ts">
	import { getEditMode } from '$lib/components/Directory/context';
	import { Fa } from 'svelte-fa';
	import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

	let { label, icon }:{ label?:string;icon?: IconDefinition } = $props();
	let editMode = getEditMode();
	let offDisabled = $state(true);
	let onDisabled = $state(false);

	const toggleEdit = (e) => {
		const btnValue = e.target.value;
		if (btnValue == 'on') {
			$editMode = true;
			onDisabled = true;
			offDisabled = false;
		} else if (btnValue == 'off') {
			$editMode = false;
			offDisabled = true;
			onDisabled = false;
		}
	};
</script>

<div class="flex justify-end variant-ringed w-min p-2 gap-2 items-center">
{#if icon}
<div><Fa icon={icon}/></div>
{/if}
{#if label}
<div>{label}</div>
{/if}
<div class="flex w-min gap-1 justify-end">
<button class="btn btn-sm variant-ringed" disabled={onDisabled} value="on" onclick={toggleEdit}>On</button>
<button class="btn btn-sm variant-ringed" disabled={offDisabled} value="off" onclick={toggleEdit}>Off</button>
</div>
</div>
