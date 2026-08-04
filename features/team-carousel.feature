Feature: Team carousel navigation

  The home page team carousel lets visitors browse the team. When there is more
  than one slide it must offer previous and next controls, and at least one of
  them must be usable — on the first slide "previous" is legitimately disabled,
  so it is "next" that must work.

  Avatar visibility itself is covered by features/avatar-access.feature.

  The home page carries a second carousel for the facilities, built from the
  same library. Everything below is about the team one, so the steps address it
  through its own section rather than through the library's markers, which both
  carousels emit.

  Scenario: Both navigation buttons are shown when the carousel has several slides
    Given the home page carousel has more than one slide
    Then a previous and a next button are visible
    And at least one of them is clickable

  Scenario: The usable button actually moves the carousel
    Given the home page carousel has more than one slide
    When I click the enabled navigation button
    Then the carousel has moved to another slide

  # The component renders its own server-side fallback (a single avatar, no
  # arrows) and swaps to the real carousel on hydration. The avatar a visitor
  # sees first must therefore be displayed at the size it keeps, so the picture
  # does not grow or shrink under them as the arrows appear.
  #
  # The component renders client-side only: letting the library render on the
  # server makes it measure its track before the avatars have an intrinsic
  # size, so it computes "nothing to scroll" and both arrows stay disabled.
  # The fallback therefore has to constrain the picture to the same width the
  # carousel gives it, by hand.
  Rule: the avatar keeps its size through hydration

    Scenario: The first avatar is displayed at its final size
      Given I load the home page without JavaScript
      And I note the size of the first avatar
      When I load the home page with JavaScript
      Then the avatar is displayed at the same size
      And the avatar has not moved horizontally

  # Regression: signing out reduces the number of avatars. The carousel library
  # caches its slide count and geometry, recomputing them only on mount and on
  # window resize, so the arrows could end up enabled but inert.
  #
  # Rather than guess which interaction triggers it, sweep the combinations that
  # plausibly matter: whether the carousel was scrolled off screen while the
  # slide list changed, whether it had already been advanced, and which arrow is
  # used afterwards. Every combination must leave the carousel navigable.
  #
  # Keeping one public avatar guarantees at least two slides remain after
  # signing out; otherwise there would be nothing to navigate and the scenario
  # would pass vacuously.
  Scenario Outline: The carousel stays navigable after the number of avatars changes
    Given an entry of this site has a public avatar
    And I am signed in with the role "superuser"
    And I open the home page
    And the carousel is "<advanced>"
    And the carousel is "<visibility>" while I sign out
    When I sign out from the app bar
    And I return to the carousel
    Then clicking "<arrow>" moves the carousel or that arrow is disabled

    Examples:
      | visibility | advanced     | arrow |
      | visible    | at the start | next  |
      | visible    | at the start | prev  |
      | visible    | advanced     | next  |
      | visible    | advanced     | prev  |
      | off screen | at the start | next  |
      | off screen | at the start | prev  |
      | off screen | advanced     | next  |
      | off screen | advanced     | prev  |
