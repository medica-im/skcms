Feature: Invitations are listed by date, newest first, and the order can be reversed

  The API returns invitations in no particular order. An administrator
  opening the list is usually looking for the invitation they just sent, so
  the list starts with the newest; the "Création" column header reverses it, for
  finding old invitations that were never used.

  Scenario: The newest invitation comes first, and the header reverses the order
    Given I am signed in with the role "administrator"
    And two invitations created a day apart exist
    When I open "/web/invite/invitees"
    Then the newer invitation is listed before the older one
    When I sort the invitations by creation date
    Then the older invitation is listed before the newer one

  # "Utilisation" sorts by when an invitation was used. Unused ones have no
  # such date and stay at the end whichever way the column is sorted: they
  # answer neither "most recently used" nor "used longest ago".
  Scenario: Sorting by use puts unused invitations last, both ways
    Given I am signed in with the role "administrator"
    And two used invitations and one unused invitation exist
    When I open "/web/invite/invitees"
    And I sort the invitations by use
    Then the most recently used invitation comes first, and the unused one last
    When I sort the invitations by use again
    Then the earliest used invitation comes first, and the unused one last

  # The column headers are only shown on large screens, so on a phone the
  # order is chosen from a control above the list.
  Scenario: On a phone, the order is chosen above the list
    Given I am signed in with the role "administrator"
    And two invitations created a day apart exist
    And I browse on a phone
    When I open "/web/invite/invitees"
    Then the newer invitation is listed before the older one
    When I choose to see the oldest invitations first
    Then the older invitation is listed before the newer one
