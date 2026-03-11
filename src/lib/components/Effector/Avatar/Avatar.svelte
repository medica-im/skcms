<script lang="ts">
	import { variables } from '$lib/utils/constants';
	import * as m from '$msgs';
	import type { EntryFull } from '$lib/store/directoryStoreInterface';

	let { data }: { data: EntryFull } = $props();

	let avatarUrl = $derived.by(() => {
		if (data?.avatar?.lg) {
			return variables.BASE_URI + data.avatar.lg;
		} else if (data?.avatar?.sm) {
			return variables.BASE_URI + data.avatar.sm;
		} else if (data?.avatar?.raw) {
			return variables.BASE_URI + data.avatar.raw;
		}
		return `/media/profile_images/default_profile_picture.png`;
	});
</script>

<img
	src={avatarUrl}
	alt="{m.ADDRESSBOOK_A11Y_PROFILE_PIC_OF()}  {data.name}"
	class="w-44 h-44 rounded-lg"
/>
