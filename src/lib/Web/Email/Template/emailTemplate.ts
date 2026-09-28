import * as m from '$msgs';

/**
 * The organization's wording of its invitation email, and the images it links.
 * Mirrors backend/src/api/types/email_template.py.
 */

export type EmailKind = 'invitation';
export type ContentType = 'html' | 'text';
/** organization: its own; default: shared by every organization; builtin: the code's. */
export type TemplateSource = 'organization' | 'default' | 'builtin';

export interface EmailTemplateDraft {
	subject: string;
	body: string;
	body_text: string;
	content_type: ContentType;
}

export interface EmailTemplate extends EmailTemplateDraft {
	kind: EmailKind;
	source: TemplateSource;
	placeholders: string[];
	required_placeholders: string[];
	/** What each placeholder prints on this site; invitee fields hold an example. */
	placeholder_values: Record<string, string>;
	/** Whether the caller may change it; seeing it only needs administrator. */
	can_edit: boolean;
	/** Who may change it: the organization's choice. */
	editor_role: 'administrator' | 'superuser';
	updated: string | null;
}

/** Why the backend refused a template: a code, translated here. */
export interface TemplateProblem {
	field: string;
	code: string;
	names?: string[] | null;
	detail?: string;
}

export interface EmailPreview {
	subject: string;
	text: string;
	html: string | null;
	problems: TemplateProblem[];
}

export interface EmailImage {
	uid: string;
	name: string;
	alt: string;
	width: number;
	height: number;
	size: number;
	created: string | null;
	/** For this site's own pages. */
	path: string;
	/** Absolute, base path included: what goes in an email. */
	url: string;
	thumbnail_url: string;
}

export const placeholder = (name: string) => `{{ ${name} }}`;

/** A field that differs with each invitee, so the page can only show an example of it. */
export const isInviteeField = (name: string) => name.startsWith('invitee_');

export function problemMessage(problem: TemplateProblem): string {
	switch (problem.code) {
		case 'syntax':
			return m.EMAIL_TEMPLATE_PROBLEM_SYNTAX({ detail: problem.detail ?? '' });
		case 'unknown_placeholder':
			return m.EMAIL_TEMPLATE_PROBLEM_UNKNOWN_PLACEHOLDER({
				names: (problem.names ?? []).map(placeholder).join(', ')
			});
		case 'missing_signin_url':
			return m.EMAIL_TEMPLATE_PROBLEM_MISSING_SIGNIN_URL({ placeholder: placeholder('signin_url') });
		case 'mjml_source':
			return m.EMAIL_TEMPLATE_PROBLEM_MJML();
		case 'required':
			return m.EMAIL_TEMPLATE_PROBLEM_REQUIRED();
		default:
			return m.EMAIL_TEMPLATE_PROBLEM_UNKNOWN({ detail: problem.detail || problem.code });
	}
}

export function imageErrorMessage(code: string | undefined): string {
	switch (code) {
		case 'too_large':
			return m.EMAIL_IMAGE_ERROR_TOO_LARGE();
		case 'unsupported_type':
			return m.EMAIL_IMAGE_ERROR_UNSUPPORTED_TYPE();
		case 'not_an_image':
			return m.EMAIL_IMAGE_ERROR_NOT_AN_IMAGE();
		case 'name_taken':
			return m.EMAIL_IMAGE_ERROR_NAME_TAKEN();
		case 'name_required':
			return m.EMAIL_IMAGE_ERROR_NAME_REQUIRED();
		default:
			return m.EMAIL_IMAGE_ERROR_UNKNOWN();
	}
}

const attribute = (value: string) =>
	value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

/** For an MJML source: mj-image takes a width in px, and the natural one keeps it sharp. */
export const mjImageTag = (image: EmailImage) =>
	`<mj-image src="${image.url}" alt="${attribute(image.alt)}" width="${image.width}px" />`;

/**
 * For hand-written HTML. Both dimensions, since Outlook ignores CSS sizes and
 * a client that blocks images keeps the layout; display:block removes the gap
 * some clients leave under an inline image.
 */
export const imgTag = (image: EmailImage) =>
	`<img src="${image.url}" alt="${attribute(image.alt)}" width="${image.width}" height="${image.height}" style="display:block; border:0;">`;

export function isDraftChanged(draft: EmailTemplateDraft, initial: EmailTemplateDraft): boolean {
	return (
		draft.subject !== initial.subject ||
		draft.body !== initial.body ||
		draft.body_text !== initial.body_text ||
		draft.content_type !== initial.content_type
	);
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} o`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`;
	const mb = bytes / (1024 * 1024);
	return `${mb.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
}
