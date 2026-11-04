<script lang="ts">
	import { popup } from '@skeletonlabs/skeleton';
	import type { PopupSettings } from '@skeletonlabs/skeleton';
	import * as m from '$msgs';
	import Fa from 'svelte-fa';
	import { faCircleQuestion } from '@fortawesome/free-regular-svg-icons';
	import { faXmark } from '@fortawesome/free-solid-svg-icons';

	const target = `name-hint-${Math.random().toString(36).slice(2)}`;
	// Click, not hover: there is no hover on a phone.
	const settings: PopupSettings = { event: 'click', target, placement: 'top' };
</script>

<button
	type="button"
	class="btn-icon min-h-[44px] min-w-[44px]"
	title={m.FACILITY_NAME_HINT_TITLE()}
	aria-label={m.FACILITY_NAME_HINT_TITLE()}
	use:popup={settings}
><Fa icon={faCircleQuestion} /></button>
<div class="card variant-filled-secondary p-4 w-72 z-50 space-y-2" data-popup={target} data-testid="name-hint">
	<button
		type="button"
		class="btn-icon min-h-[44px] min-w-[44px] float-right -mt-3 -mr-3 ml-1"
		title={m.FACILITY_NAME_HINT_CLOSE()}
		aria-label={m.FACILITY_NAME_HINT_CLOSE()}
		data-testid="name-hint-close"
	><Fa icon={faXmark} /></button>
	<p class="!mt-0">{m.FACILITY_NAME_HINT_WHY()}</p>
	<p>{m.FACILITY_NAME_HINT_EXAMPLES_INTRO()}</p>
	<ul class="list-disc pl-5">
		<li>{m.FACILITY_NAME_HINT_EXAMPLE_1()}</li>
		<li>{m.FACILITY_NAME_HINT_EXAMPLE_2()}</li>
		<li>{m.FACILITY_NAME_HINT_EXAMPLE_3()}</li>
	</ul>
	<p>{m.FACILITY_NAME_HINT_NO_NAME()}</p>
</div>
