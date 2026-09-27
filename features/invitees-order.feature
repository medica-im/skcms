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
