import { describe, it, expect } from 'vitest';
import { programsCopy, programsHeading } from './copy';
import { cptsPostgres, mspPostgres } from '$lib/constants';

const org = 'la CPTS Lyon 3ème';

describe('the programs section heading', () => {
	// An MSP presents these as the care it offers on top of consultations;
	// a CPTS is a coordinating body, so the same links are its missions.
	it('calls them health actions in an MSP', () => {
		const copy = programsCopy(mspPostgres, org);
		expect(copy.title).toBe('Actions santé');
		expect(copy.lead).toContain('séances et consultations');
		expect(copy.lead).toContain(org);
	});

	it('calls them missions in a CPTS', () => {
		const copy = programsCopy(cptsPostgres, org);
		expect(copy.title).toBe('Nos missions');
		expect(copy.lead).toContain(org);
		expect(copy.lead).not.toContain('séances et consultations');
	});

	// A new category must not render a section with an empty heading; the
	// MSP wording is the older and more general of the two.
	it('falls back to the MSP wording for an unknown category', () => {
		const copy = programsCopy('unknown-category', org);
		expect(copy.title).toBe('Actions santé');
		expect(copy.lead).toContain(org);
	});

	it('survives a missing category', () => {
		expect(() => programsCopy(undefined, org)).not.toThrow();
		expect(programsCopy(undefined, org).title).toBe('Actions santé');
	});
});

describe('the lead paragraph override', () => {
	// A site may have nothing useful to add under the heading. Passing an empty
	// string says so explicitly, and must be distinguishable from passing
	// nothing at all — which still means "use the wording for my category".
	it('is suppressed by an explicit empty string', () => {
		expect(programsCopy(cptsPostgres, org, '').lead).toBe('');
		expect(programsCopy(mspPostgres, org, '').lead).toBe('');
	});

	it('keeps the category wording when no override is given', () => {
		expect(programsCopy(cptsPostgres, org, undefined).lead).toContain(org);
		expect(programsCopy(mspPostgres, org).lead).toContain('séances et consultations');
	});

	it('is replaced by a site-specific sentence when one is given', () => {
		const own = 'Une phrase propre à ce site.';
		expect(programsCopy(cptsPostgres, org, own).lead).toBe(own);
	});

	// The heading is the section's identity and is never suppressed.
	it('never affects the title', () => {
		expect(programsCopy(cptsPostgres, org, '').title).toBe('Nos missions');
		expect(programsCopy(mspPostgres, org, '').title).toBe('Actions santé');
	});
});

describe('the footer column heading', () => {
	// The footer wants a bare noun for a column head ("missions"), not the
	// section title ("Nos missions") that heads the home page block.
	it('calls the column missions in a CPTS', () => {
		expect(programsHeading(cptsPostgres)).toBe('missions');
	});

	it('calls the column programmes in an MSP', () => {
		expect(programsHeading(mspPostgres)).toBe('programmes');
	});

	it('falls back to the MSP wording for an unknown or missing category', () => {
		expect(programsHeading('unknown-category')).toBe('programmes');
		expect(programsHeading(undefined)).toBe('programmes');
	});
});
