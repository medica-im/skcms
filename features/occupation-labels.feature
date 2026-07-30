Feature: Occupation button labels

  The team page shows one button per effector type. Type names can be very long
  ("communauté professionnelle territoriale de santé") and overflow the button
  on mobile, so the button shows the shortest form that is still grammatically
  correct, and the tooltip explains it in full.

  Only an acronym may replace the flexed label. Acronyms are invariable, so
  "CPTS" is right whatever the gender and number of the group. Any other short
  label ("kiné", "podologue") is a singular masculine form and would be wrong
  for a plural or feminine group, so the properly flexed label wins there.

  Rule: an acronym is shown when it is shorter than the flexed label

    Scenario Outline: <case>
      Given an effector type named "<name>" labelled "<label>"
      And the flexed label for the group is "<flexed>"
      Then the button shows "<button>"
      And its tooltip shows "<tooltip>"

      Examples: acronyms are invariable, so they are safe to display
        | case                            | name                                             | label                       | flexed      | button | tooltip                                          |
        | Acronym in the label            | communauté professionnelle territoriale de santé | CPTS                        | communautés | CPTS   | communauté professionnelle territoriale de santé |
        | Acronym in the name             | CMP                                              | centre médico-psychologique | centres     | CMP    | centre médico-psychologique                      |
        | Accented long form stays intact | Équipe mobile de gériatrie                       | EMG                         | équipes     | EMG    | Équipe mobile de gériatrie                       |

      Examples: grammar wins over brevity
        | case                             | name                                | label     | flexed      | button      | tooltip                             |
        | Short label is not invariable    | kinésithérapeute                    | kiné      | kinés       | kinés       | kinésithérapeute                    |
        | Feminine plural must stay flexed | infirmière                          | infirmier | infirmières | infirmières | infirmière                          |
        | Capitalised phrase is no acronym | Unité de rééducation nutritionnelle | nutrition | unités      | unités      | Unité de rééducation nutritionnelle |

      Examples: the acronym must actually be shorter
        | case                          | name            | label | flexed | button | tooltip         |
        | Acronym longer than the label | maison de santé | MSPPP | MSP    | MSP    | maison de santé |

  Rule: a single letter is not an acronym

    Scenario: An initial does not replace the label
      Given an effector type named "podologue" labelled "P"
      And the flexed label for the group is "podologues"
      Then the button shows "podologues"
      And its tooltip shows "podologue"

  # End to end: the acronym is authored on the graph node, survives the API's
  # gendered replacement as raw_label, and reaches the rendered button.
  Rule: the Team component shows the acronym

    Scenario: The CPTS button is abbreviated on the team page
      Given the home page team section is displayed
      Then an occupation button shows "CPTS"
      And that button's tooltip is "communauté professionnelle territoriale de santé"
