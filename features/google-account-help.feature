Feature: A help page explains how to sign in with Google using the invited address

  An invitation is bound to one email address: the one it was sent to. The
  site recognises a member only when the Google account they sign in with
  carries that exact address. Anyone else can still sign in, but lands as an
  unknown user, and nothing on screen tells them why.

  Most invitees are not technical. The trap they fall into is believing that
  a Google account *is* a Gmail mailbox: without a Gmail address, they think
  they cannot sign in, and while creating a Google account they accept the
  new @gmail.com address Google offers first, which then matches no
  invitation. The page therefore says, in plain French, that a Google account
  works with any address, and names the exact button to click ("Utiliser
  l'adresse e-mail existante") at the step where Google offers the Gmail one.

  It is public: the people who need it are, by definition, not signed in yet.
  It is linked right under the "Se connecter avec Google" button, where the
  question comes up.

  Scenario: The sign-in page leads to the help page
    Given I am signed out
    When I open "/signin"
    And I follow the Google account help link
    Then I am on the Google account help page

  Scenario: The help page carries the messages that prevent the usual mistakes
    Given I am signed out
    When I open "/compte-google"
    Then I am on the Google account help page
    And the page says an invitation is bound to a single email address
    And the page says a Google account is not a Gmail mailbox
    And the page names the "Utiliser l'adresse e-mail existante" button
    And the page explains that another address needs a new invitation

  Scenario: The help page fits a phone screen
    Given I am signed out
    And I browse on a phone
    When I open "/compte-google"
    Then I am on the Google account help page
    And the page does not scroll sideways
