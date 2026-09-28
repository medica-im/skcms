@invitation-email-delivery
Feature: Whether an invitation's email went out

  An invitation whose email never left used to look like any other: the
  invitee waited, the administrator knew nothing, and only the invitee's
  silence said so. Each attempt at sending it is now recorded, and the
  invitations page shows the outcome.

  In the list, every invitation says it in an "Envoi" column, where an email
  that did not go out is a red cross leading to the invitation's page. On a
  phone the list has no columns, so a failed or pending email is
  flagged on the invitation's card instead. The invitation's own page always says it, and gives the reason of
  a failure so the administrator knows whether the address or the service
  is at fault.

  Scenario: Every invitation says in the "Envoi" column whether its email went out
    Given an invitation whose email was refused with "401: Forbidden"
    And an invitation whose email was sent
    And I am signed in with the role "administrator"
    When I open "/web/invite/invitees"
    Then in the "Envoi" column the invitation whose email was refused is a red cross leading to its page
    And in the "Envoi" column the invitation whose email was sent reads "Envoyé"
    And no warning repeats it under the address

  Scenario: On a phone, a failed email is flagged on the invitation's card
    Given an invitation whose email was refused with "401: Forbidden"
    And an invitation whose email was sent
    And I am signed in with the role "administrator"
    And I browse on a phone
    When I open "/web/invite/invitees"
    Then the invitation whose email was refused is flagged "Échec de l'envoi"
    And the invitation whose email was sent carries no email warning

  # The cross is where the eye lands; the reason and the resend button are
  # one click away.
  Scenario: The red cross leads to the reason of the failure
    Given an invitation whose email was refused with "401: Forbidden"
    And I am signed in with the role "administrator"
    When I open "/web/invite/invitees"
    And I follow the red cross of the invitation whose email was refused
    Then I read that its email failed with "401: Forbidden"

  Scenario: The invitation's page gives the reason of the failure
    Given an invitation whose email was refused with "401: Forbidden"
    And I am signed in with the role "administrator"
    When I open the page of the invitation whose email was refused
    Then I read that its email failed with "401: Forbidden"

  Rule: an invitation's email can be sent again, once at a time

    # After a failure, or because the invitee lost it. Each attempt is a new
    # record, so a failure stays in the history. A successful resend goes
    # through the real mail service, so it is covered by the backend tests
    # (tests/api/test_invitee_resend.py), not here.

    Scenario: A used invitation cannot be sent again
      Given a used invitation whose email was sent
      And I am signed in with the role "administrator"
      When I open the page of the used invitation
      Then I am not offered to send the invitation again

    # A double click must not send two emails.
    Scenario: An email already on its way is not sent a second time
      Given an invitation whose email is on its way
      And I am signed in with the role "administrator"
      When I open the page of the invitation whose email is on its way
      And I ask to send the invitation again
      Then I am told an email is already on its way
      And no second email was recorded
