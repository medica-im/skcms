<script lang="ts">
	import { phoneTypes } from './phone';
	import { getEditMode } from '$lib/components/Directory/context.ts';
    import UpdatePhone from '$lib/Web/Phone/UpdatePhone.svelte';
	import DeletePhone from '$lib/Web/Phone/DeletePhone.svelte';
	import Fa from 'svelte-fa';
	import { faMobileScreen, faPhone, faFax, faHeadset } from '@fortawesome/free-solid-svg-icons';
	import type { Phone } from '$lib/interfaces/phone.interface.ts';
	let { data, editMode }:{data: Phone; editMode?: boolean} = $props();

	const iconDict: object = {
		M: faMobileScreen,
		MW: faMobileScreen,
		W: faPhone,
		F: faFax,
		AS: faHeadset
	};

	function getIcon(type: string) {
		return iconDict[type as keyof object];
	}
</script>

<div class="flex content-start space-x-4 items-center">
	<div class="flex-initial">
		<span class="w-4" aria-label={phoneTypes[data.type]}><Fa icon={getIcon(data.type)} size="sm" /></span>
	</div>
	<a class="unstyled underline underline-offset-4" aria-describedby="phonetype" href="tel:{data.phone}">
		<div class="flex-initial">{data.phone}</div>
	</a>
	{#if editMode}
    <UpdatePhone {data}/> <DeletePhone {data} />
	{/if}
</div>
<div role="tooltip" id="phonetype">
  <p>Password Rules:</p>
  <ul>
    <li>Minimum of 8 characters</li>
    <li>
      Include at least one lowercase letter, one uppercase letter, one number
      and one special character
    </li>
    <li>Unique to this website</li>
  </ul>
</div>

<style>
[role="tooltip"] {
  visibility: hidden;
  position: absolute;
  top: 2rem;
  left: 2rem;
  background: black;
  color: white;
  padding: 0.5rem;
  border-radius: 0.25rem;
  /* Give some time before hiding so mouse can exit the input
  and enter the tooltip */
  transition: visibility 0.5s;
}
[aria-describedby]:hover,
[aria-describedby]:focus {
  position: relative;
}
[aria-describedby]:hover + [role="tooltip"],
[aria-describedby]:focus + [role="tooltip"],
[role="tooltip"]:hover,
[role="tooltip"]:focus {
  visibility: visible;
}
</style>