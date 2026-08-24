Feature: Hovering a facility button points it out on the map

  The facility section lists every facility as a button beside the map. A
  reader scanning that list wants to know where each one is, and the map is
  right there — so hovering a button picks that facility out.

  Two things have to happen, in that order, and the order is the whole point.

  First the frame is reset. The reader may have panned or zoomed since the map
  loaded, and the facility a button names can easily be off screen; drawing
  attention to a marker nobody can see is no help at all. So the view goes back
  to the bounds that hold *every* facility.

  Then, inside that frame, the one facility is picked out — a larger marker,
  the others faded. The map does not zoom to it. Zooming to a single facility
  answers a question nobody asked and throws away the context that makes the
  highlight mean anything: which of the thirteen it is, and where it sits
  relative to the rest. Hovering down the list should feel like a light moving
  over a fixed map, not like the map chasing the pointer.

  Nothing is removed from the map while a facility is highlighted. Both map
  components derive their bounds from the data they are given, so dropping the
  other points would refit the view a second time and the map would lurch.

  Covers both maps on /_test/map-cluster: the one the site ships, and the
  clustered experiment beside it.

  Rule: the frame is reset before the facility is picked out

    Scenario: A zoomed-in map returns to the full view on hover
      Given I open the facility section
      And I have zoomed the map in on one corner
      When I hover a facility button
      Then the map shows every facility again

    # The reset is a reset, not a flight to the hovered pin. If the map ended up
    # centred on that facility the reader would lose the arrangement that tells
    # them which one it is.
    Scenario: The map does not zoom to the hovered facility
      Given I open the facility section
      When I hover a facility button
      Then the map is not centred on that facility alone
      And the zoom is the one that fits every facility

  Rule: the hovered facility stands out inside that frame

    Scenario: The hovered facility is emphasised and the others recede
      Given I open the facility section
      When I hover a facility button
      Then that facility's marker is emphasised
      And the other markers are dimmed

    # Every point stays on the map: removing the others would refit the bounds
    # and move the camera a second time.
    Scenario: No facility is removed while one is highlighted
      Given I open the facility section
      And I note how many facilities are on the map
      When I hover a facility button
      Then the same number of facilities is still on the map

  # Regression: the clustered map read and wrote the same state inside one
  # $effect, so the first hover threw effect_update_depth_exceeded and the map
  # stopped reacting to anything after it. A single hover looked fine in a
  # screenshot; only moving on to a second button showed it was stuck.
  Rule: the highlight follows the pointer from one button to the next

    Scenario: Hovering a second facility moves the highlight to it
      Given I open the facility section
      When I hover a facility button
      And I then hover a different facility button
      Then the second facility's marker is emphasised
      And the first facility's marker is no longer emphasised
      And exactly one facility is emphasised

    Scenario: The map keeps reacting after several hovers
      Given I open the facility section
      When I hover each facility button in turn
      Then the last facility hovered is the emphasised one
      And no error was raised in the page

    Scenario: The clustered map also follows the pointer
      Given I open the clustered facility section
      When I hover a facility button
      And I then hover a different facility button
      Then the second facility's marker is emphasised
      And exactly one facility is emphasised

  # Leaving a button is not a reason to move the camera: snapping back as the
  # pointer travels between buttons would yank the map around.
  Rule: leaving a button does not move the map

    Scenario: The view stays put when the pointer leaves
      Given I open the facility section
      When I hover a facility button
      And I move the pointer off it
      Then the view has not moved
      And no marker is emphasised

  # The clustered map has the same job, and one case the other cannot have: the
  # hovered facility may be swallowed by a bubble, and a bubble reading "3" does
  # not say which of its three is meant.
  #
  # Tinting the bubble was tried and is not enough — a differently coloured "3"
  # still names three places. The bubble has to come apart: every facility it
  # held is drawn at its own coordinates, and the hovered one is picked out
  # among them. That way the reader sees both which facility it is and what it
  # was grouped with.
  Rule: a hovered facility inside a cluster breaks that cluster open

    Scenario: The cluster is replaced by its own points
      Given I open the clustered facility section
      When I hover a facility button whose facility sits inside a cluster
      Then the cluster it belonged to is gone
      And every facility that cluster held is drawn as its own marker

    Scenario: The hovered facility is the one picked out among them
      Given I open the clustered facility section
      When I hover a facility button whose facility sits inside a cluster
      Then that facility's marker is emphasised
      And the facilities it was clustered with are visible but not emphasised
