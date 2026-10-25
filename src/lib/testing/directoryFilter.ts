import { expect, type Mock } from 'vitest';
import { page as screen, userEvent } from 'vitest/browser';

const option = (label: string) =>
	[...document.querySelectorAll<HTMLElement>('.svelte-select-list .item')].find(
		(e) => e.textContent?.trim() === label
	);

/**
 * Picks `label` from an address-book filter. Firefox keeps one focus across
 * vitest's iframes, so a parallel file can blur the input and close the list at
 * any moment: typing reopens it, and the option is clicked in the same breath it
 * is seen rather than after a wait it may not survive.
 */
export async function choose(placeholder: string, label: string) {
	const input = screen.getByPlaceholder(placeholder);
	await expect
		.poll(async () => {
			const found = option(label);
			if (found) found.click();
			else await userEvent.fill(input, label);
			return !!found;
		})
		.toBe(true);
}

export async function clear() {
	await expect.poll(() => document.querySelector('.svelte-select .clear-select')).not.toBeNull();
	await userEvent.click(document.querySelector<HTMLElement>('.svelte-select .clear-select')!);
}

/** The query string of the last address `goto` was sent to, or null if it never was. */
export const lastQuery = (goto: Mock) => {
	const target = goto.mock.calls.at(-1)?.[0] as string | undefined;
	return target === undefined ? null : new URL(target, 'https://site.test').searchParams;
};
