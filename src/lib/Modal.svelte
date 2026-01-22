<script lang="ts">
  import type { Snippet } from 'svelte'
  import { createDialog } from 'svelte-headlessui'
  import {
	blur,
	crossfade,
	draw,
	fade,
	fly,
	scale,
	slide
} from 'svelte/transition';

  interface Props {
    children: Snippet
    commands: Snippet
    onclose: () => void
  }

  let { children, commands, onclose }: Props = $props()

  const dialog = createDialog()

  // functions allow opening and closing the dialog from the host element
  export function open() {
    dialog.open()
  }

  export function close() {
    dialog.close()
  }
</script>

  <div class="z-10">
      
      <button class="fixed inset-0 bg-surface-500 bg-opacity-50" onclick="{close}"></button>

    <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        
          <div
            class="bg-opacity-100 bg-surface-500 relative transform overflow-hidden rounded-lg text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
            use:dialog.modal
            {onclose}
          >
            <div class="bg-opacity-100  px-4 pb-4 pt-5 sm:p-6 sm:pb-4">{@render children()}</div>
            <div class="px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">{@render commands()}</div>
          </div>
      </div>
    </div>
  </div>
