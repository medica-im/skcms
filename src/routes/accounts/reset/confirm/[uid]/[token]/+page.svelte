<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import * as m from "$msgs";
	import Fa from 'svelte-fa';
	import { faRightToBracket } from '@fortawesome/free-solid-svg-icons';
	import { changeText } from '$lib/helpers/buttonText';
	import { fly } from 'svelte/transition';
	import type { CustomError } from '$lib/interfaces/error.interface';
	import {
		faTriangleExclamation,
	} from '@fortawesome/free-solid-svg-icons';
	

	export let data: PageData;
	export let form: ActionData;

    const minLength = 8;

	let password: string = '';
    let confirmPassword: string = '';
    let errors: Array<CustomError>;
    let passCountBadge: string;
    let passCount: number;
	let visible: boolean = true;

    $: passCount=passwordLength(password, confirmPassword);

    function passwordLength(password: string, confirmPassword: string) {
        let pass = password.length || 0;
        let conf = confirmPassword.length || 0;
        let max = Math.max(pass, conf);
        return max;
    }

	const passwordConfirm = () => (password !== confirmPassword ? false : true);
</script>

<!--div class="flex flex-col">
<div>uid:{data.uid}</div>
<div>token:{data.token}</div>
</div-->

<svelte:head>
	<title>{m.CHANGE_PASSWORD()}</title>
</svelte:head>

<div>
    		<header>
			<div class="section-container">
				<h1 class="h1">{m.CHANGE_PASSWORD()}</h1>
			</div>
		</header>

	<section
		class="container"
		in:fly={{ y: 100, duration: 500, delay: 500 }}
		out:fly={{ duration: 500 }}
	>

		<div class="section-container">

	{#if form?.errors && visible}
    <aside class="alert variant-ghost">
        <!-- Icon -->
        <div><Fa icon={faTriangleExclamation}/></div>
        <!-- Message -->
        <div class="alert-message">
            <h3 class="h3">{m.ERROR}</h3>
                    {#each form.errors as error}
            <p class="center error">{error.error}</p>
        {/each}
        </div>
        <!-- Actions -->
        <div class="alert-actions"><button class="btn" on:click={()=>visible=false}>OK</button></div>
    </aside>
    {/if}
			<form class="space-y-4 lg:max-w-2xl" method="POST">
				<input type="hidden" id="uid" name="uid" value={data.uid} />
				<input type="hidden" id="token" name="token" value={data.token} />
				<input
					class="input"
					bind:value={password}
					type="password"
					name="new_password1"
                    autocomplete="new-password"
					aria-label="password"
                    disabled={form?.success}
					placeholder={m.ENTER_PASSWORD()}
					required
				/>
				<input
					class="input"
					bind:value={confirmPassword}
					type="password"
					name="new_password2"
                    autocomplete="new-password"
					aria-label="$LL.CONFIRL"
                    disabled={form?.success}
					placeholder={m.CONFIRM_PASSWORD()}
					required
				/>
					<button
						class="btn bg-primary-500"
						type="submit"
                        disabled={password!=confirmPassword || password?.length<8 || form?.success}
						on:click={(e) => changeText(e, 'Registering...')}
					>
						{m.SET_NEW_PASSWORD()}
					</button>
                    {#if password || confirmPassword}
                    <span class={passCount>=minLength ? 'badge variant-ghost-success' : 'badge variant-ghost-error'}>{passCount} {passCount>1 ? m.CHARACTER_PLURAL() : m.CHARACTER_SINGULAR()}</span>
                    {/if}
			</form>
			{#if form?.success}
				<!-- this message is ephemeral; it exists because the page was rendered in
       response to a form submission. it will vanish if the user reloads -->
				<p>{m.CHANGE_PASSWORD_SUCCESS()}</p>
                <a class="anchor" href="/accounts/login"
					><div class="flex flex-nowrap space-x-2"><span><Fa icon={faRightToBracket} size="lg" /></span>
					<span>{m.NAVBAR_LOGIN()}</span></div></a
				>
			{/if}
		</div>
	</section>
</div>

<style lang="postcss">
	.section-container {
		@apply w-full max-w-7xl mx-auto p-4 py-4 md:py-8 space-y-2 md:space-y-4;
	}
</style>