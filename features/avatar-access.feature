Feature: Avatar access level

  A user can choose who may see their profile picture (avatar): the public,
  the team (organization members), or administrators only. The chosen level
  is the minimum privilege required to see the avatar — viewers at that level
  or with higher privilege see the picture; viewers below it see the fallback
  placeholder instead, everywhere the avatar is used in the frontend.

  Access levels, from least to most restrictive:
    | level  | role           | who can see the avatar                          |
    | Public | anonymous      | everyone, including logged-out visitors         |
    | Team   | staff          | organization members, admins, superusers        |
    | Admin  | administrator  | organization admins and superusers only         |

  Background:
    Given a registered user "Camille" who owns the entry "camille-mg-84"

  Scenario: Choosing an avatar access level when adding or editing the avatar
    Given Camille is signed in
    And Camille is on her entry page "/e/camille-mg-84"
    When she enables edit mode
    And she opens the avatar upload dialog
    Then she can choose an avatar access level among "Public", "Team", and "Admin"

  Scenario Outline: The avatar is visible only at or above the chosen access level
    Given Camille has set her avatar access level to "<access>"
    When a viewer with role "<viewer_role>" visits her entry page "/e/camille-mg-84"
    Then the avatar picture is "<visibility>"

    Examples:
      | access | viewer_role   | visibility |
      | Public | anonymous     | shown      |
      | Public | staff         | shown      |
      | Public | administrator | shown      |
      | Team   | anonymous     | hidden     |
      | Team   | staff         | shown      |
      | Team   | administrator | shown      |
      | Admin  | anonymous     | hidden     |
      | Admin  | staff         | hidden     |
      | Admin  | administrator | shown      |

  Scenario: A hidden avatar falls back to the placeholder wherever it is used
    Given Camille has set her avatar access level to "Team"
    And a viewer with role "anonymous" is browsing the site
    When the viewer sees Camille's entry in the directory listing
    Then the avatar shows the fallback placeholder instead of the picture
