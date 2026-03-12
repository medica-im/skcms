<script lang="ts">
	import { variables } from '$lib/utils/constants';
	import * as m from '$msgs';
	import type { Avatar } from '$src/lib/interfaces/facility.interface';
	
	type AvatarSize = "lg" | "sm";

	let { avatar, name, size }: { avatar: Avatar; name: string; size: AvatarSize; } = $props();

	let avatarUrl = $derived.by(() => {
		if ( size=="lg" && avatar?.lg ) {
			return variables.BASE_URI + avatar.lg;
		} else if ( size=="sm" && avatar?.sm ) {
			return variables.BASE_URI + avatar.sm;
		} else if ( avatar?.raw ) {
			return variables.BASE_URI + avatar.raw;
		}
		return `/media/profile_images/default_profile_picture.png`;
	});
</script>

<img
	src={avatarUrl}
	alt="{m.ADDRESSBOOK_A11Y_PROFILE_PIC_OF()}  {name}"
	class="{size=="sm" ? "h-44 w-44" : "h-72 w-72"} rounded-lg lg:rounded-none lg:rounded-tl-lg"
/>
