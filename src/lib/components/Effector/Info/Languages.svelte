<script lang="ts">
	import * as m from "$msgs";	import Fa from 'svelte-fa';
	import { capitalizeFirstLetter } from '$lib/helpers/stringHelpers';
	import type { SpokenLanguage } from "$lib/interfaces/fullEffector.interface";
	export let data: SpokenLanguage[]|null;
</script>
{#if data}
{#if data.length < 2}{capitalizeFirstLetter(m.ADDRESSBOOK_SPOKEN_LANGUAGE())}{:else}{capitalizeFirstLetter(m.ADDRESSBOOK_SPOKEN_LANGUAGES())}{/if}:
{#each data as language, i}
	{#if i == 0}{' '}{language.name}{:else}{' '}{language.name}{/if}{#if i < data.length - 2},{:else if i == data.length - 2}{' '}{m.AND()}{:else}.{/if}
{/each}
{:else}
{capitalizeFirstLetter(m.ADDRESSBOOK_SPOKEN_LANGUAGES())}: ∅
{/if}
