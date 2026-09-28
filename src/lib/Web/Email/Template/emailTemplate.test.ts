import { describe, expect, it } from 'vitest';
import * as m from '$msgs';
import {
	formatBytes,
	imageErrorMessage,
	imgTag,
	isDraftChanged,
	mjImageTag,
	isInviteeField,
	problemMessage,
	type EmailImage
} from './emailTemplate';

const IMAGE: EmailImage = {
	uid: 'u1',
	name: 'Logo',
	alt: 'Logo du "cabinet"',
	width: 240,
	height: 80,
	size: 12_345,
	created: null,
	path: '/media/email_images/o/a.png',
	url: 'https://example.org/annuaire/media/email_images/o/a.png',
	thumbnail_url: 'https://example.org/annuaire/media/email_images/o/a.png.thumb.png'
};

describe('what the backend refused, in words', () => {
	it('names the unknown placeholders', () => {
		const text = problemMessage({ field: 'body', code: 'unknown_placeholder', names: ['invitee_nam', 'x'] });

		expect(text).toContain('{{ invitee_nam }}');
		expect(text).toContain('{{ x }}');
	});

	it('has a message for every code the backend sends', () => {
		for (const code of ['syntax', 'unknown_placeholder', 'missing_signin_url', 'mjml_source', 'required']) {
			expect(problemMessage({ field: 'body', code, names: [] })).not.toBe('');
		}
	});

	it('still says something for a code it does not know', () => {
		expect(problemMessage({ field: 'body', code: 'new_rule', detail: 'why' })).toBe(
			m.EMAIL_TEMPLATE_PROBLEM_UNKNOWN({ detail: 'why' })
		);
	});

	it('explains every refused upload', () => {
		for (const code of ['too_large', 'unsupported_type', 'not_an_image', 'name_taken', 'name_required']) {
			expect(imageErrorMessage(code)).not.toBe(m.EMAIL_IMAGE_ERROR_UNKNOWN());
		}
		expect(imageErrorMessage(undefined)).toBe(m.EMAIL_IMAGE_ERROR_UNKNOWN());
	});
});

describe('snippets to paste into a template', () => {
	it('an mj-image carries the absolute url, the alt and the natural width', () => {
		expect(mjImageTag(IMAGE)).toBe(
			`<mj-image src="${IMAGE.url}" alt="Logo du &quot;cabinet&quot;" width="240px" />`
		);
	});

	it('an img tag carries the absolute url and both dimensions', () => {
		expect(imgTag(IMAGE)).toBe(
			`<img src="${IMAGE.url}" alt="Logo du &quot;cabinet&quot;" width="240" height="80" style="display:block; border:0;">`
		);
	});
});

describe('change detection', () => {
	const initial = { subject: 's', body: 'b', body_text: '', content_type: 'html' as const };

	it('an untouched draft has no changes', () => {
		expect(isDraftChanged({ ...initial }, initial)).toBe(false);
	});

	it('any field edited is a change', () => {
		expect(isDraftChanged({ ...initial, body_text: 't' }, initial)).toBe(true);
		expect(isDraftChanged({ ...initial, content_type: 'text' }, initial)).toBe(true);
	});
});

describe('formatBytes', () => {
	it.each([
		[512, '512 o'],
		[12_345, '12 ko'],
		[2_500_000, '2,4 Mo']
	])('%i bytes read as %s', (bytes, text) => {
		expect(formatBytes(bytes)).toBe(text);
	});
});

describe('which values are made up', () => {
	// The invitee's fields change with every invitation: the page can only show
	// an example. Everything else is what this site's emails will really say.
	it('the invitee fields hold an example', () => {
		expect(isInviteeField('invitee_name')).toBe(true);
		expect(isInviteeField('invitee_email')).toBe(true);
	});

	it('the organization and site fields hold the real value', () => {
		for (const name of ['organization_name', 'organization_short_name', 'site_url', 'signin_url']) {
			expect(isInviteeField(name)).toBe(false);
		}
	});
});
