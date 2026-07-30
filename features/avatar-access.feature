Feature: Avatar access level

  A user can choose who may see their profile picture (avatar): the public,
  the team (organization members), or administrators only. The chosen level
  is the minimum privilege required to see the avatar — viewers at that level
  or with higher privilege see the picture; viewers below it get no picture at
  all from the API, so the frontend falls back to the placeholder everywhere
  the avatar is used.

  Enforcement is server-side (api.utils.scrub_avatar), so a restricted picture
  is never sent to an unauthorized viewer.

  Background:
    Given the entry "isabelle-dubuis-orthoptiste-69" has an avatar

  Scenario Outline: A public visitor only sees avatars allowed to the public
    Given the avatar access level is "<access>"
    When a signed-out visitor requests the entry
    Then the avatar is "<visibility>"

    Examples:
      | access        | visibility |
      | anonymous     | shown      |
      | staff         | hidden     |
      | administrator | hidden     |

  Scenario Outline: A hidden avatar is also absent from the directory listing
    Given the avatar access level is "<access>"
    When a signed-out visitor requests the directory listing
    Then the listed entry avatar is "<visibility>"

    Examples:
      | access        | visibility |
      | anonymous     | shown      |
      | staff         | hidden     |
      | administrator | hidden     |

  Scenario: The entry page shows the placeholder when the avatar is restricted
    Given the avatar access level is "staff"
    When a signed-out visitor opens the entry page
    Then no profile picture is rendered on the page

  # The home page team carousel is a third surface showing avatars. It must show
  # every avatar the viewer is allowed to see, and no others.
  Scenario: The team carousel hides an avatar the visitor may not see
    Given the avatar access level is "staff"
    When a signed-out visitor opens the home page
    Then the team carousel does not show the entry's picture

  Scenario: The team carousel shows an avatar the viewer is allowed to see
    Given the avatar access level is "staff"
    And I am signed in with the role "staff"
    When I open the home page
    Then the team carousel shows the entry's picture

  # Signing in or out changes the viewer's role, so the carousel must update on
  # its own — without the user pressing reload.
  Scenario: Signing in reveals newly authorized avatars without a manual reload
    Given the avatar access level is "staff"
    And a signed-out visitor is on the home page
    And the team carousel does not show the entry's picture
    When the visitor signs in with Google as "staff"
    Then the team carousel shows the entry's picture without a page reload

  Scenario: Signing out hides avatars that are no longer authorized
    Given the avatar access level is "staff"
    And I am signed in with the role "staff"
    And I open the home page
    And the team carousel shows the entry's picture
    # Signing out keeps the user on /signout, so return to the home page by
    # in-app navigation — still no manual reload.
    When I sign out
    And I navigate back to the home page
    Then the team carousel does not show the entry's picture without a page reload

  # Regression: signing out from the app bar redirects back to the same page, so
  # the carousel stayed on screen with pictures the visitor may no longer see.
  Scenario: Signing out from the app bar on the home page clears restricted pictures
    Given the avatar access level is "staff"
    And I am signed in with the role "superuser"
    And I open the home page
    And the team carousel shows the entry's picture
    When I sign out from the app bar
    Then the team carousel does not show the entry's picture without a page reload
