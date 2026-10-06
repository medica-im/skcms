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
