/**
 * The public addresses of a Google calendar, for a visitor to subscribe from
 * their own calendar app. They are only usable because the calendar is public,
 * which it already has to be for the API key to read it.
 */
import { describe, it, expect } from 'vitest';
import { googleCalendarLinks } from './googleCalendarLinks';

const ID = 'c_abc123+x@group.calendar.google.com';

describe('googleCalendarLinks', () => {
	it('gives the public iCal feed, with the ID escaped in the path', () => {
		expect(googleCalendarLinks(ID).ical).toBe(
			'https://calendar.google.com/calendar/ical/c_abc123%2Bx%40group.calendar.google.com/public/basic.ics'
		);
	});

	it('gives the same feed as webcal, which calendar apps open as a subscription', () => {
		expect(googleCalendarLinks(ID).webcal).toBe(
			'webcal://calendar.google.com/calendar/ical/c_abc123%2Bx%40group.calendar.google.com/public/basic.ics'
		);
	});

	it('gives the Google Calendar link that adds the calendar by its ID', () => {
		const url = new URL(googleCalendarLinks(ID).google);
		expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
		expect(url.searchParams.get('cid')).toBe(ID);
	});
});
