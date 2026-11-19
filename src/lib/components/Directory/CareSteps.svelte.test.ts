/**
 * Where an entry sits in the care pathway (« Étape dans le parcours de soins »): the five
 * steps in their order, from prevention to emergencies, with the entry's own marked, so a
 * reader sees at once whether it is a first port of call or a specialist's. The steps it
 * does not occupy stay legible (AA), only quieter; an entry that does not say shows nothing.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page as screen } from 'vitest/browser';
import * as m from '$msgs';
import CareSteps from './CareSteps.svelte';
import { AA_TEXT, inScheme, legibility } from '#lib/testing/contrast.ts';
import '../../../app.postcss';

document.body.dataset.theme = 'wintry';

const steps = () =>
	screen
		.getByRole('list', { name: m.DIRECTORY_ENTRY_CARE_PATH() })
		.getByRole('listitem')
		.elements();

describe('CareSteps', () => {
	it('shows nothing when the level of care is unknown', async () => {
		render(CareSteps, { props: { levels: null } });
		await expect.element(screen.getByText(m.DIRECTORY_ENTRY_CARE_PATH())).not.toBeInTheDocument();
	});

	it('lists the five steps in the order of the pathway', async () => {
		render(CareSteps, { props: { levels: ['secondary'] } });
		expect(steps().map((step) => step.textContent?.trim())).toEqual([
			m.DIRECTORY_CARE_STEP_PREVENTION(),
			m.DIRECTORY_CARE_STEP_PRIMARY(),
			m.DIRECTORY_CARE_STEP_SECONDARY(),
			m.DIRECTORY_CARE_STEP_TERTIARY(),
			m.DIRECTORY_CARE_STEP_EMERGENCY()
		]);
	});

	it("marks the entry's own steps, and only those", async () => {
		render(CareSteps, { props: { levels: ['emergency', 'primary'] } });
		expect(steps().map((step) => step.dataset.current)).toEqual([
			'false',
			'true',
			'false',
			'false',
			'true'
		]);
	});

	for (const scheme of ['light', 'dark'] as const) {
		it(`reads at AA in ${scheme} mode, marked steps and the others alike`, async () => {
			await inScheme(scheme, async () => {
				render(CareSteps, { props: { levels: ['primary'] } });
				const unreadable = steps()
					.map((el) => ({ text: el.textContent?.trim(), ratio: legibility(el) }))
					.filter(({ ratio }) => ratio < AA_TEXT);
				expect(unreadable).toEqual([]);
			});
		});
	}
});
