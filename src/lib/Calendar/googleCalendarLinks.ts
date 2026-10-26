export function googleCalendarLinks(calendarId: string) {
	const feed = `calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
	return {
		google: `https://calendar.google.com/calendar/render?${new URLSearchParams({ cid: calendarId })}`,
		ical: `https://${feed}`,
		webcal: `webcal://${feed}`
	};
}
