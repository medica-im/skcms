Feature: The invitations list can be narrowed to one status

  Above the list, a segmented control shows every status with its count:
  Toutes, Actives (can still be used), Utilisées, and Désactivées (switched
  off, never used) when there is one. The list opens on Toutes.

  The choice is kept in the address (?statut=...), so the back button, a
  reload and a shared link all show the same list. The control is the same
  on a narrow screen: a four-way choice is one tap, never a menu.

  Background:
    Given I am signed in with the role "administrator"
    And an active, a used and a deactivated invitation exist

  Scenario: Choosing a status shows only those invitations, and survives a reload
    When I open "/web/invite/invitees"
    Then the active, used and deactivated invitations are all listed
    When I show only the "Utilisées" invitations
    Then only the used invitation is listed
    And the address asks for "statut=utilisees"
    When I reload the page
    Then only the used invitation is listed

  Scenario: The same control on a narrow screen
    Given I browse on a phone
    When I open "/web/invite/invitees"
    And I show only the "Désactivées" invitations
    Then only the deactivated invitation is listed
