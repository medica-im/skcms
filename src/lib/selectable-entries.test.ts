import { describe, it, expect } from 'vitest';
import { selectableEntries } from '../../steps/fixtures';

describe('selectableEntries', () => {
	it('keeps the active entries of the site', () => {
		const entries = [
			{ entrySlug: 'dupont-jean-medecin-69', active: true },
			{ entrySlug: 'martin-lea-ide-69', active: false }
		];
		expect(selectableEntries(entries)).toEqual([entries[0]]);
	});

	it('leaves out the IPA entry that exists to be tagged', () => {
		expect(selectableEntries([{ entrySlug: 'dupont-jean-ipa-69', active: true }])).toEqual([]);
	});

	it("never offers another worker's clone, which is deleted when its scenario ends", () => {
		const entries = [
			{ entrySlug: 'dupont-jean-medecin-69-e2eSeed3-x1y2z3', active: true },
			{ entrySlug: 'dupont-jean-medecin-69-e2eseed-a1b2c3', active: true },
			{ entrySlug: 'dupont-jean-medecin-69', active: true }
		];
		expect(selectableEntries(entries)).toEqual([entries[2]]);
	});
});
