@invitation-email-delivery
Feature: Whether an invitation's email went out

  An invitation whose email never left used to look like any other: the
  invitee waited, the administrator knew nothing, and only the invitee's
  silence said so. Each attempt at sending it is now recorded, and the
  invitations page shows the outcome.

  In the list only what needs attention is flagged -- a failed, pending or
  unconfirmed email -- because "sent" on every row would bury the one that
  failed. The invitation's own page always says it, and gives the reason of
  a failure so the administrator knows whether the address or the service
  is at fault.

  Background:
    Given an invitation whose email was refused with "401: Forbidden"
    And an invitation whose email was sent
    And I am signed in with the role "administrator"

  Scenario: A failed email is flagged in the list, a sent one is not
    When I open "/web/invite/invitees"
    Then the invitation whose email was refused is flagged "Échec de l'envoi"
    And the invitation whose email was sent carries no email warning

  Scenario: The invitation's page gives the reason of the failure
    When I open the page of the invitation whose email was refused
    Then I read that its email failed with "401: Forbidden"
