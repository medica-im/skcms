Feature: A refused address cannot be submitted again unchanged

  An invitation to an address that already has one, or that already belongs to
  a member of the site, is refused. Sending the same address again can only be
  refused again, so the button stays off until the address is actually
  different — and "different" ignores case, as the backend does. The refusal
  disappears with the address it was about.

  Scenario: The button waits for a different address
    Given I am signed in with the role "administrator"
    And an invitation already exists for an address
    When I open "/web/invite/create"
    And I invite that address as staff
    Then I read that an invitation to it already exists
    And the invitation cannot be created
    When I type that same address in capitals
    Then the invitation cannot be created
    When I type another address
    Then the invitation can be created
    And the refusal is no longer shown
