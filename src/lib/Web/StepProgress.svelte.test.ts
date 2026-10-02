/**
 * The entry creation form's step bar (1 to 4) on a phone.
 *
 * It sat at the start of the page's centred column (self-start) and, with its
 * 32px connectors and 16px insets, was wider than a 375px screen's content:
 * step 4 touched the edge. It is mounted here inside the page's own container
 * (/web/entry: a centred flex column with a 16px gutter), so what is measured
 * is where it actually lands.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import StepProgress from './StepProgress.svelte';
import '../../app.postcss';

const STEPS = [
	{ label: 'Établissement', completed: false },
	{ label: 'Catégorie', completed: false },
	{ label: 'Personne', completed: false },
	{ label: 'Valider', completed: false }
];

const GUTTER = 16;

async function mountOnAPhone() {
	await page.viewport(375, 800);
	const container = document.createElement('div');
	container.className = 'mx-0 flex flex-col items-center justify-center p-4 py-6 space-y-2';
	document.body.appendChild(container);
	render(StepProgress, { target: container, props: { steps: STEPS } });
	await expect.element(page.getByText('Valider')).toBeInTheDocument();
	return (container.firstElementChild as HTMLElement).getBoundingClientRect();
}

describe('StepProgress on a phone', () => {
	it('fits inside the page gutter', async () => {
		const bar = await mountOnAPhone();
		expect(bar.left).toBeGreaterThanOrEqual(GUTTER);
		expect(bar.right).toBeLessThanOrEqual(375 - GUTTER);
	});

	it('is centred', async () => {
		const bar = await mountOnAPhone();
		expect(Math.abs(bar.left - (375 - bar.right))).toBeLessThanOrEqual(1);
	});
});
