/**
 * A batch job's status, as the histories and the report show it.
 *
 * Imports and reminders are both batch jobs, but they do not do the same
 * thing: an import creates invitations, a reminder sends existing ones again.
 * A reminder that ended is "Relance terminée", never "Création en masse
 * terminée" -- nothing was created. Each status also carries an icon and a
 * colour, so it never depends on colour alone.
 */
import { describe, it, expect } from 'vitest';
import { faBan, faCheck, faClock, faSpinner, faXmark } from '@fortawesome/free-solid-svg-icons';
import { batchJobStatus } from './batchJobStatus';

describe('batchJobStatus', () => {
	it('words an import by what it did', () => {
		expect(batchJobStatus('completed', 'create').label).toBe('Création en masse terminée');
		expect(batchJobStatus('cancelled', 'create').label).toBe('Création en masse annulée');
	});

	it('words a reminder by what it did', () => {
		expect(batchJobStatus('completed', 'resend').label).toBe('Relance terminée');
		expect(batchJobStatus('cancelled', 'resend').label).toBe('Relance arrêtée');
	});

	it('words the statuses both kinds share the same way', () => {
		for (const kind of ['create', 'resend'] as const) {
			expect(batchJobStatus('pending', kind).label).toBe('En attente');
			expect(batchJobStatus('processing', kind).label).toBe('Traitement en cours...');
			expect(batchJobStatus('failed', kind).label).toBe('Échec');
		}
	});

	it('gives each status its icon and colour', () => {
		expect(batchJobStatus('completed', 'create')).toMatchObject({ icon: faCheck, className: 'text-success-500' });
		expect(batchJobStatus('cancelled', 'create')).toMatchObject({ icon: faBan, className: 'text-warning-500' });
		expect(batchJobStatus('failed', 'create')).toMatchObject({ icon: faXmark, className: 'text-error-500' });
		expect(batchJobStatus('processing', 'create')).toMatchObject({ icon: faSpinner, className: 'text-primary-500' });
		expect(batchJobStatus('pending', 'create')).toMatchObject({ icon: faClock, className: 'text-surface-500' });
	});

	it('is an import when the job does not say', () => {
		expect(batchJobStatus('completed').label).toBe('Création en masse terminée');
	});
});
