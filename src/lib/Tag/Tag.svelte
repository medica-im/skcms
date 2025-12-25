<script lang="ts">
    import * as m from '$msgs';
    import {
		faMagnifyingGlass, faQuestion
	} from '@fortawesome/free-solid-svg-icons';
	import Fa from 'svelte-fa';
    import { popup } from '@skeletonlabs/skeleton';
    import type { Tag, TagCategory } from "$lib/store/directoryStoreInterface";
    import type { PopupSettings } from '@skeletonlabs/skeleton';
    let { data } : { data: Tag[]|null; } = $props();
    const tagMap = $derived.by(()=>{
        const tagMap: Map<string, Tag[]> = new Map();
        data?.forEach(
            (t)=>{
                const tags = tagMap.get(t.category.name);
                if ( tags ) {
                    tags.push(t)
                    tagMap.set(t.category.name, tags);
                } else {
                    tagMap.set(t.category.name, [t]);
                }
            });
        return tagMap
    });
    const messages:{[key: string]: any} = {
	mention_ipa: m.mention_ipa
};
</script>
<!--{JSON.stringify([...tagMap][0])}<br-->
{#each tagMap.keys() as key}
    <div class="flex flew-wrap gap-2 items-center">
        <div>{messages[key]({count: tagMap.get(key)!.length})}:</div>
    <div>
    {#each tagMap.get(key) as tag, i}
        
		<!--svelte:fragment slot="lead">(icon)</svelte:fragment-->
		{tag.labelShort} <button class="btn btn-sm variant-ghost p-2" use:popup={{
	event: 'hover',
	target: 'popupHover-' + i,
	placement: 'bottom'
}}><Fa icon={faQuestion} size="sm"/></button>

<div class="card p-4 variant-filled-primary" data-popup={'popupHover-' + i}>
	<p>{tag.label}</p>
	<div class="arrow variant-filled-primary"></div>
</div>
    {/each}
    </div>
    </div>
{/each}

