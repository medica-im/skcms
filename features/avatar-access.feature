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
