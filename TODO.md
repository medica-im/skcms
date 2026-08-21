## create Entry
* allow entering commune without selecting department: send API request if input has more than 2 chars

## cross-tab refresh after a facility edit
* changing a facility's GPS refreshes the entries in the tab that saved it
  (`invalidate('app:entries')` in UpdateFacilityModal), but a directory map open
  in another tab keeps the old pin until it reloads or is navigated away from
  and back. The server cache is already cleared by then, so the data is correct
  and merely not asked for.
* a `BroadcastChannel` would cover other tabs in the same browser: post on a
  successful save, `invalidate('app:entries')` on receipt in the root layout.
  Same origin, no server involvement.
* it would not cover another person's browser — that needs SSE or polling, which
  is a much larger change and probably not worth it for coordinate edits.
