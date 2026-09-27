Feature: An administrator edits or deletes an invitation that has not been used

  An invitation that nobody has redeemed yet can be corrected (a typo in the
  address, the wrong role) or withdrawn. Both open a dialog over the page the
  administrator is on, and both bring them back to the list of invitations.

  Every URL in this flow must carry the site's base path. unipa is served under
  /annuaire behind the WordPress that owns its root, and a path the app builds
  without the prefix belongs to WordPress, not to the app: SvelteKit refuses to
  preload it ("Attempted to preload a URL that does not belong to this app")
  and the dialog never opens. That is how deleting an invitation broke on
  dev.unipa.fr on 27 Sep 2026 while working on every site served at its root,
  so these scenarios only prove something when they run on a base-path site
  as well as a root one.

  Background:
    Given I am signed in with the role "administrator"
    And an unused invitation exists
    And I am on that invitation's page

  Scenario: Deleting an invitation removes it and returns to the list
    When I choose to delete the invitation
    Then the delete dialog asks me to confirm
    When I confirm the deletion
    Then I am back on the list of invitations
    And the invitation no longer exists

  Scenario: Cancelling the deletion keeps the invitation
    When I choose to delete the invitation
    And I cancel the dialog
    Then I am back on the list of invitations
    And the invitation still exists

  Scenario: Editing an invitation saves the change and returns to the list
    When I choose to edit the invitation
    And I change the invitee's name to "Nom corrigé"
    And I save the invitation
    Then I am back on the list of invitations
    And the invitation's name is "Nom corrigé"
