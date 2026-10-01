/**
 * The facility list behind the entry creation form's facility select.
 *
 * By default it is the site's list (backend: the site's entries, plus the
 * facilities attached to the organization or created by the user). A superuser
 * creating a new project's organization entry needs another site's facility,
 * so the whole graph is one explicit step away: scope=all, refused by the
 * backend to anyone else.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$lib/utils/origin.ts', () => ({ ORIGIN: 'https://api.test' }));

import { getFacilities } from './data';

describe('getFacilities', () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		fetchMock.mockResolvedValue({ json: async () => [] });
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		fetchMock.mockReset();
	});

	it("asks for the site's list by default", async () => {
		await getFacilities();
		expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/v2/facilities');
	});

	it('asks for every site when told to', async () => {
		await getFacilities('all');
		expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/v2/facilities?scope=all');
	});
});
