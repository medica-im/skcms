Feature: The map frames every facility on first display

  A directory map is opened to answer one question before any other: where are
  these places, and how are they arranged relative to each other. A map that
  opens on one facility at an arbitrary zoom cannot answer it. The reader has
  no way to know that anything is missing — there is no scrollbar on a map, and
  nothing on screen says "eleven more, north of here". They simply read a
  partial set as the whole set.

  So the opening frame is not a starting point to be panned away from: it is
  the answer, and it has to be right in the first painted frame, before any
  interaction and without a reload.

  This is about the *initial* camera only. Once the reader pans or zooms the
  map is theirs, and refitting under them would be the separate defect that
  map-hover-highlight.feature guards against.

  Regression: MapLibreClustered.svelte computed the bounding box of every
  facility and then never handed it to the map. It opened at data[0]'s
  coordinates and a hardcoded zoom of 13 instead — the *first facility in the
  sorted list*, which is not the centre of anything. On a tightly clustered
  directory that accidentally looks correct, which is exactly why it survived:
  whether the bug is visible depends entirely on how spread out the seeded data
  happens to be. MapLibre.svelte beside it passes `bounds` and has always been
  right.

  The scenarios therefore assert against the data the site actually holds
  rather than against a fixed zoom, and they run on both maps: the rule belongs
  to "the facility map", not to one implementation of it.

  Rule: every facility is inside the opening frame

    # The plain statement of the bug. No hover, no zoom, no reload — the frame
    # as it is first painted.
    Scenario Outline: <map> opens with every facility in view
      Given I open the facility maps
      Then every facility on the <map> map is inside the viewport

      Examples:
        | map       |
        | current   |
        | clustered |

    # A map can satisfy the above by being zoomed so far out that the points are
    # a single speck in the middle of an empty continent — technically all in
    # frame, useless to read. Fitting the data means the points also *fill* the
    # frame reasonably.
    Scenario Outline: <map> is zoomed to the facilities, not far past them
      Given I open the facility maps
      Then the facilities span a usable share of the <map> map

      Examples:
        | map       |
        | current   |
        | clustered |

  Rule: the opening frame comes from the data, not from one facility

    # The heart of the regression. Opening on data[0] puts the first facility
    # dead centre; a frame fitted to the whole set almost never does, because
    # the centre of a bounding box is not one of the points that defines it.
    #
    # Compared against the map that ships rather than against a threshold: both
    # are showing the same facilities, so a genuinely fitted clustered map lands
    # on materially the same centre and scale as the one beside it. This is the
    # assertion that would still have caught the bug on tightly clustered data.
    Scenario: The clustered map opens on the same frame as the map that ships
      Given I open the facility maps
      Then both maps are showing the same area

  Rule: the frame survives a reload

    # As reported: "on first render, after reload for instance". A fit that only
    # happens once the source has settled can be missed when a reload changes
    # the order in which the style, the data and the map's load event arrive.
    Scenario: A reloaded clustered map still frames every facility
      Given I open the facility maps
      When I reload the map page
      Then every facility on the clustered map is inside the viewport
      And the facilities span a usable share of the clustered map
