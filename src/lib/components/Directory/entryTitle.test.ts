/**
 * How an entry's page is titled. An organisation known by an acronym is titled by it, with
 * its full name just below, so « UNAFAM » is recognised and « Union nationale de familles
 * et amis… » is still said. A person is titled by their name: their label is the surname
 * the lists sort on, never a title.
 */
import { describe, it, expect } from 'vitest';
import { entryTitle } from './entryTitle.ts';

const UNAFAM = 'Union nationale de familles et amis de personnes malades et/ou handicapées psychiques';

describe('entryTitle', () => {
	it('titles an organisation by its short name, with its full name below', () => {
		expect(entryTitle({ name: UNAFAM, label: 'UNAFAM', nature: 'service' })).toEqual({ title: 'UNAFAM', subtitle: UNAFAM });
	});

	it('has no subtitle when the short name is the name', () => {
		expect(entryTitle({ name: 'UNAFAM', label: 'UNAFAM', nature: 'service' })).toEqual({ title: 'UNAFAM', subtitle: null });
		expect(entryTitle({ name: 'Apsytude', label: null, nature: 'service' })).toEqual({ title: 'Apsytude', subtitle: null });
	});

	it('titles a person by their name, whatever their label', () => {
		expect(entryTitle({ name: 'Catherine Marchal', label: 'Marchal', nature: 'profession' })).toEqual({
			title: 'Catherine Marchal',
			subtitle: null
		});
	});

	it('treats an entry of unknown nature as a person would be, by its name', () => {
		expect(entryTitle({ name: 'Simon Ulivi', label: 'Ulivi', nature: null })).toEqual({ title: 'Simon Ulivi', subtitle: null });
	});
});
