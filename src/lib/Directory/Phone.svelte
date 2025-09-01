<script lang="ts">
	import { getEditMode } from '$lib/components/Directory/context.ts';
    import UpdatePhone from '$lib/Web/Phone/UpdatePhone.svelte';
	import DeletePhone from '$lib/Web/Phone/DeletePhone.svelte';
	import Fa from 'svelte-fa';
	import { faMobileScreen, faPhone, faFax, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
	import type { Phone } from '$lib/interfaces/phone.interface.ts';
	let { phoneData, editMode }:{phoneData: Phone; editMode: boolean} = $props();

	const iconDict: object = {
		M: faMobileScreen,
		MW: faMobileScreen,
		W: faPhone,
		F: faFax
	};

	function getIcon(type: string) {
		return iconDict[type as keyof object];
	}
</script>

<div class="flex content-start space-x-4 items-center">
	<div class="flex-initial">
		<span class="w-4"><Fa icon={getIcon(phoneData.type)} size="sm" /></span>
	</div>
	<a class="unstyled underline underline-offset-4" href="tel:{phoneData.phone}">
		<div class="flex-initial">{phoneData.phone}</div>
	</a>
	{#if editMode}
    <UpdatePhone {phoneData}/> <DeletePhone {phoneData} />
	{/if}
</div>
