<script lang="ts">
	import Fa from 'svelte-fa';
	import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
	import * as m from '$msgs';

	let {
		selected,
		sendable,
		onlyExcluded,
		onselectall,
		onselectnone,
		ononlyexcluded,
		oncancel,
		onsend
	}: {
		selected: number;
		sendable: number;
		onlyExcluded: boolean;
		onselectall: () => void;
		onselectnone: () => void;
		ononlyexcluded: (only: boolean) => void;
		oncancel: () => void;
		onsend: () => void;
	} = $props();
</script>

<div
	class="card variant-glass-surface sticky bottom-0 z-10 mt-4 p-3 shadow-xl flex flex-wrap items-center gap-3"
	data-testid="resend-bar"
>
	<span class="text-sm font-semibold">
		{m.USERS_SELECTED_COUNT({ selected, total: sendable })}
	</span>
	<button type="button" class="btn min-h-11 variant-ghost" onclick={onselectall}>
		{m.USERS_SELECT_ALL()}
	</button>
	<button type="button" class="btn min-h-11 variant-ghost" onclick={onselectnone}>
		{m.USERS_DESELECT_ALL()}
	</button>
	<label class="flex min-h-11 items-center gap-2 text-sm">
		<input
			type="checkbox"
			class="checkbox"
			checked={onlyExcluded}
			onchange={(e) => ononlyexcluded(e.currentTarget.checked)}
		/>
		<span>{m.INVITEE_RESEND_ONLY_EXCLUDED()}</span>
	</label>
	<div class="ml-auto flex gap-2">
		<button type="button" class="btn min-h-11 variant-ghost-surface" onclick={oncancel}>
			{m.CANCEL()}
		</button>
		<button
			type="button"
			class="btn min-h-11 variant-filled-primary"
			disabled={selected === 0}
			onclick={onsend}
		>
			<span><Fa icon={faPaperPlane} /></span>
			<span>{m.INVITEE_RESEND_SEND({ count: selected })}</span>
		</button>
	</div>
</div>
