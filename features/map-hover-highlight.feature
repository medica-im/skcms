Feature: Picking a facility shows it alone on the map

  The facility section lists every facility as a button beside the map. A
  reader scanning that list wants to know where each one is, and the map is
  right there — so picking a button shows that facility on the map.

  "Picking" is whatever the reader's input can do: hovering a button with a
  mouse, tapping one with a finger. The old name for this was "hover", which
  outlived its accuracy once touch got the same affordance.

  Picking leaves *only* that facility on the map. Emphasising it in place was
  tried first — a bigger marker, the others faded — and it does not survive
  contact with a crowded directory: thirteen pins in a few streets means the
  emphasised one is touching its neighbours, and on a phone the difference
  between a large pin and a small one is a few pixels. Removing the others is
  unambiguous at any size.

  The frame does not follow. The view stays fitted to the whole set, so the
  reader keeps the arrangement that tells them *which* facility it is and where
  it sits relative to the rest. Picking down the list should feel like a light
  moving over a fixed map, not like the map chasing the pointer.

  Covers both maps on /_test/map-cluster: the one the site ships, and the
  clustered experiment beside it.

  Rule: the map frames the whole set, and picking does not move it

    Scenario: A zoomed-in map returns to the full view when a facility is picked
      Given I open the facility section
      And I have zoomed the map in on one corner
      When I hover a facility button
      Then the map returns to the frame that fits every facility

    # The reset is a reset, not a flight to the picked pin. If the map ended up
    # centred on that facility the reader would lose the arrangement that tells
    # them which one it is.
    Scenario: The map does not zoom to the picked facility
      Given I open the facility section
      When I hover a facility button
      Then the zoom is the one that fits every facility

  Rule: the picked facility is the only one left on the map

    Scenario: Picking a facility leaves its marker alone on the map
      Given I open the facility section
      When I hover a facility button
      Then exactly one facility is on the map
      And that facility's marker is the picked one

    Scenario: The clustered map also shows the picked facility alone
      Given I open the clustered facility section
      When I hover a facility button
      Then exactly one facility is on the map
      And that facility's marker is the picked one

  # Regression: the clustered map read and wrote the same state inside one
  # $effect, so the first hover threw effect_update_depth_exceeded and the map
  # stopped reacting to anything after it. A single hover looked fine in a
  # screenshot; only moving on to a second button showed it was stuck.
  Rule: the choice follows the pointer from one button to the next

    Scenario: Hovering a second facility moves the choice to it
      Given I open the facility section
      When I hover a facility button
      And I then hover a different facility button
      Then the second facility is the one on the map
      And exactly one facility is on the map

    Scenario: The map keeps reacting after several hovers
      Given I open the facility section
      When I hover each facility button in turn
      Then the last facility hovered is the one on the map
      And no error was raised in the page

    Scenario: The clustered map also follows the pointer
      Given I open the clustered facility section
      When I hover a facility button
      And I then hover a different facility button
      Then the second facility is the one on the map
      And exactly one facility is on the map

  # Leaving a button is not a reason to move the camera: snapping back as the
  # pointer travels between buttons would yank the map around.
  Rule: leaving a button restores the full set without moving the map

    Scenario: Every facility comes back when the pointer leaves
      Given I open the facility section
      When I hover a facility button
      And I move the pointer off it
      Then every facility is on the map again
      And the view has not moved

  # A facility swallowed by a cluster is the case the clustered map has and the
  # other cannot: a bubble reading "3" does not say which of its three is meant.
  # Isolating answers it outright — the bubble is gone because everything it
  # stood for is gone, and the one facility asked for is what remains.
  Rule: picking a facility inside a cluster resolves the cluster

    Scenario: The bubble gives way to the picked facility
      Given I open the clustered facility section
      When I hover a facility button whose facility sits inside a cluster
      Then exactly one facility is on the map
      And that facility's marker is the picked one
