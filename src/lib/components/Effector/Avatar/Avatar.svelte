<script lang="ts">
	import { variables } from '$lib/utils/constants';
	import * as m from '$msgs';
	import type { Avatar } from '$src/lib/interfaces/facility.interface';
	import { avatarSrc, type AvatarSize } from './avatarUrl.ts';
	import { PUBLIC_URL } from '$lib/utils/appUrl';

	let { avatar, name, size }: { avatar: Avatar; name: string; size: AvatarSize; } = $props();

	// No cache-busting here: each upload is stored under its own filename
	// (api/routers/avatar.py), so a replaced picture arrives with a URL of its
	// own and ordinary caching does the right thing.
	let avatarUrl = $derived(avatarSrc(avatar, size, PUBLIC_URL));
</script>

<img
	src={avatarUrl}
	alt="{m.ADDRESSBOOK_A11Y_PROFILE_PIC_OF()}  {name}"
	class="{size=="sm" ? "h-44 w-44" : "h-72 w-72"} rounded-lg lg:rounded-none lg:rounded-tl-lg"
/>
