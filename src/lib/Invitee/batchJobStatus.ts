/**
 * A batch job's status, as the histories and the report show it.
 * The rules and why: see batchJobStatus.test.ts.
 */
import {
	faBan,
	faCheck,
	faClock,
	faSpinner,
	faXmark,
	type IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import * as m from '$msgs';

export type BatchKind = 'create' | 'resend';

export function batchJobStatus(
	status: string,
	kind: BatchKind = 'create'
): { icon: IconDefinition; className: string; label: string } {
	const resend = kind === 'resend';
	switch (status) {
		case 'completed':
			return {
				icon: faCheck,
				className: 'text-success-500',
				label: resend ? m.REMINDER_COMPLETED() : m.BATCH_INVITEE_COMPLETED()
			};
		case 'cancelled':
			return {
				icon: faBan,
				className: 'text-warning-500',
				label: resend ? m.REMINDER_CANCELLED() : m.BATCH_INVITEE_CANCELLED()
			};
		case 'failed':
			return { icon: faXmark, className: 'text-error-500', label: m.BATCH_JOB_FAILED() };
		case 'processing':
			return { icon: faSpinner, className: 'text-primary-500', label: m.BATCH_INVITEE_PROCESSING() };
		default:
			return { icon: faClock, className: 'text-surface-500', label: m.BATCH_JOB_PENDING() };
	}
}
