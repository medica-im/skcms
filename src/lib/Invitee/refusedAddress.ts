const normalize = (address: string) => address.trim().toLowerCase();

/**
 * Whether the address in the field is still the one the backend refused.
 *
 * `issues` are the email field's issues from the last submission, `submitted`
 * the address that submission carried (null before any), `current` the field.
 */
export function addressStillRefused(
	issues: readonly unknown[],
	submitted: string | null,
	current: string
): boolean {
	return issues.length > 0 && submitted !== null && normalize(submitted) === normalize(current);
}
