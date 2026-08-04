Feature: Seeing the photograph of a facility

  A facility's photograph is there for the people looking for the place: it is
  what lets a patient recognize the building as they arrive. So it is shown to
  everyone who opens the facility page, signed in or not — unlike the button
  that uploads it, which only the people answerable for the facility ever see.

  The picture is wide (16:9) and displayed as such. Squeezing it into the
  square frame used for personal avatars would crop away the facade.

  Rule: the photograph is shown to every visitor

    Scenario Outline: The picture is displayed whoever is looking
      Given the facility of this site has a place picture
      And I am signed in as "<who>"
      When I open the facility page for that facility
      Then the facility photograph is displayed

      Examples:
        | who        |
        | signed out |
        | registered |
        | staff      |

    # Nothing is uploaded here, so nothing must be shown: an empty frame or a
    # broken image would be worse than no picture at all.
    Scenario: A facility without a photograph shows none
      Given a facility of this site has no place picture
      When I open the facility page for that facility
      Then no facility photograph is displayed

  Rule: seeing is not editing

    # The picture is public; the button that changes it is not. A visitor who
    # can see the photograph must still be offered no way to replace it.
    Scenario: A signed-out visitor sees the picture but no button
      Given the facility of this site has a place picture
      And I am signed out
      When I open the facility page for that facility
      Then the facility photograph is displayed
      And I do not see the "add picture" button

  Rule: the photograph is described for people who cannot see it

    Scenario: The picture carries its description
      Given the facility of this site has a place picture
      When I open the facility page for that facility
      Then the facility photograph has a text description
