Feature: Invitees page is reserved for administrators

  The invitees page (/web/invite/invitees) manages invitations and is reserved
  for administrators and super-administrators. A signed-in user without that
  privilege — a team member, for instance — must not be left in front of an
  empty list: the page explains that the section is reserved for administrators
  and offers a way out (back to the previous page when they came from the site,
  otherwise the home page).

  Signed-out visitors keep the existing behaviour and are sent to sign in.

  Scenario: A signed-out visitor is redirected to sign in
    Given I am signed out
    When I open "/web/invite/invitees"
    Then I am redirected to the sign-in page

  Scenario Outline: A signed-in user without administrator privileges gets an explanation
    Given I am signed in with the role "<role>"
    When I open "/web/invite/invitees"
    Then the response status is 403
    And I see a message explaining the page is reserved for administrators
    And the list of invitees is not rendered
    And I see a link to the home page

    Examples:
      | role       |
      | staff      |
      | registered |

  Scenario: The back link is offered when the user came from another page of the site
    Given I am signed in with the role "staff"
    And I am on the home page
    When I follow a link to "/web/invite/invitees"
    Then I see a link to the home page
    And I see a "back" control

  Scenario: Only the home link is offered when the page was opened directly
    Given I am signed in with the role "staff"
    When I open "/web/invite/invitees" directly
    Then I see a link to the home page
    And I do not see a "back" control

  Scenario Outline: Administrators still reach the page
    Given I am signed in with the role "<role>"
    When I open "/web/invite/invitees"
    Then the invitees page is displayed

    Examples:
      | role          |
      | administrator |
      | superuser     |
