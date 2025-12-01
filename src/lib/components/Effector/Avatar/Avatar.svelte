<script lang="ts">
	import { variables } from '$lib/utils/constants';
	import * as m from '$msgs';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';

	export let data: EntryFull;

	function getUrl(data) {
		if (data?.avatar && data?.avatar?.lt) {
			return variables.BASE_URI + data.avatar.lt;
		} else if (data?.avatar && data?.avatar?.fb) {
			return variables.BASE_URI + data.avatar.fb;
		} else if (data?.avatar && data?.avatar?.raw) {
			return variables.BASE_URI + data.avatar.raw;
		} else {
			return `/media/profile_images/default_profile_picture.png`;
		}
	}
</script>

<img
	src={getUrl(data)}
	alt="{m.ADDRESSBOOK_A11Y_PROFILE_PIC_OF()}  {null}"
	class="w-44 h-44 rounded-lg"
/>
