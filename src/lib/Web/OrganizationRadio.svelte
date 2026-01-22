<script lang="ts">
	import type { ChangeEventHandler } from "svelte/elements";

	let {
		isMember = $bindable(),
	} : {
		isMember: boolean | undefined;
	} = $props();

	let orgRadio: string | undefined = $state();

	let arr = [
		{ label: 'Oui', value: 'yes', data: true },
		{ label: 'Non', value: 'no', data: false }
	];
	function onInput(event: Event) {
	if (event) {
		const target = event.target as HTMLSelectElement;
		console.log("onChange target.value", target.value);
		isMember = target.value === "yes"
		console.log("isMember", isMember);
	}
	}
</script>

<div class="py-2 space-y-2">
	<div class="flex items-center space-x-4">
		{#each arr as row}
			<label class="flex items-center space-x-2">
				<input
					class="radio"
					type="radio"
					value={row.value}
					bind:group={orgRadio}
					oninput={onInput}
				/>
				<p>{row.label}</p>
			</label>
		{/each}
	</div>
</div>
