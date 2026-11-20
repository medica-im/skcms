/**
 * What a remote `form` looks like to the component that spreads it onto a
 * <form>, for the component tests that only care about the dialog around it:
 * no issues, nothing pending, no result, and inputs named as SvelteKit names
 * them (`<field>/form`).
 *
 * vi.mock factories run before imports, so a test reaches this through
 * `await import(...)` inside the factory.
 */
export function fakeRemoteForm() {
	const form = {};
	const hidden = (value: unknown) => ({ value, enumerable: false });
	Object.defineProperties(form, {
		fields: hidden(
			new Proxy(
				{},
				{
					get: (_, field) =>
						field === 'allIssues'
							? () => []
							: {
									issues: () => [],
									as: (type: string, value?: unknown) => ({
										name: `${String(field)}/form`,
										type,
										value
									})
								}
				}
			)
		),
		pending: hidden(0),
		result: hidden(undefined),
		enhance: hidden(() => ({ method: 'POST' }))
	});
	return form;
}
