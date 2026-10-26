/**
 * The public calendar page lets a visitor take the calendar home: subscribed in
 * their own calendar app, its events stay up to date without coming back here.
 */
import { describe, it, expect } from 'vitest';
import '../../app.postcss';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import GoogleCalendar from './GoogleCalendar.svelte';
import { googleCalendarLinks } from './googleCalendarLinks';

const calendarId = 'c_abc123@group.calendar.google.com';
const links = googleCalendarLinks(calendarId);

describe('GoogleCalendar', () => {
	it('offers this calendar to Google Calendar and to webcal apps', async () => {
		render(GoogleCalendar, { calendarId, apiKey: 'test-key' });

		await expect
			.element(page.getByRole('link', { name: 'Google Agenda' }))
			.toHaveAttribute('href', links.google);
		await expect
			.element(page.getByRole('link', { name: 'iPhone, Mac, Outlook' }))
			.toHaveAttribute('href', links.webcal);
	});

	it('offers the iCal address to copy, for any other app', async () => {
		render(GoogleCalendar, { calendarId, apiKey: 'test-key' });

		await expect
			.element(page.getByRole('button', { name: 'Copier le lien iCal' }))
			.toHaveAttribute('data-copy-text', links.ical);
	});
});
