Feature: The invitations list learns what became of each email

  "Envoyé" only means the mail service accepted the email. What happens next
  -- delivered, or rejected by the recipient's server -- arrives seconds to
  minutes later, through the service's webhook. The list is loaded once, so
  an invitation to a mailbox that does not exist stayed "Envoyé" there until
  the administrator opened its page.

  No polling: the backend pushes each change of an email's status to the open
  list (Server-Sent Events, GET /api/v2/invitees/events), which updates that
  row in place.

  Scenario: A rejected email shows up in the list without reloading
    Given I am signed in with the role "administrator"
    And an invitation whose email was just sent
    When I open the invitations list
    Then that invitation's email is shown as "Envoyé"
    When the mail service reports that the email bounced
    Then without reloading, that invitation's email is shown as "Rejeté"

  # The invitation's page too: after a correction, the administrator waits
  # there to see the new address accepted, then delivered.
  Scenario: An invitation's page learns its email was delivered without reloading
    Given I am signed in with the role "administrator"
    And an invitation whose email was just sent
    When I open its page
    Then its page says its email is "E-mail envoyé"
    When the mail service reports that the email was delivered
    Then without reloading, its page says its email is "E-mail distribué"

  # The administrator resends from an invitation's page and goes straight back
  # to the list rather than wait there. The stream belongs to the invitation
  # pages as a whole, not to one page, so what the mail service reports on the
  # way back is shown on the list. (The just-sent email stands for the resent
  # one: resending for real would send a real email.)
  Scenario: A status reported on the way back to the list is shown there
    Given I am signed in with the role "administrator"
    And an invitation whose email was just sent
    When I open its page
    And I go back to the list while the mail service reports that the email was delivered
    Then without reloading, that invitation's email is shown as "Distribué"
