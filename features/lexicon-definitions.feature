Feature: Lexicon terms explain themselves where the reader meets them

  The site is written for patients and for professionals at once, so its prose
  is full of abbreviations that one audience reads without noticing and the
  other cannot read at all. A term in the lexicon carries a "?" the reader can
  open, and the popup gives the definition without taking them off the page.

  A term may be a synonym: "MSP" is a key whose entry names "Maison de santé
  pluriprofessionnelle", and the definition to show is the one stored under
  *that* term. Resolving it wrongly is not a visible crash — the popup opens
  and shows a name where a definition belongs — which is how the lookup stayed
  broken: it asked whether an array was a key of the lexicon, always false, so
  the synonym branch never ran and every reader clicking "MSP" got the words
  "Maison de santé pluriprofessionnelle" as the whole explanation.

  Hence a browser scenario rather than a unit test of the lookup. The unit test
  says the lookup is right; only a rendered page says the component reads it
  right, and the defect lived in the gap between those two statements. It also
  covers what a unit test structurally cannot: that the popup opens on click at
  all, and that its "en savoir plus" link arrives at the matching entry on the
  lexique page rather than at a missing anchor.

  The prose is a fixture at /_test/lexicon-terms rather than a real page. A real
  page's wording changes for editorial reasons, and a scenario pinned to it
  fails for reasons that have nothing to do with the lexicon.

  Rule: a term shows its definition, following a synonym to the entry that holds it

    Scenario: The definition of a synonym comes from the term it points at
      Given I am on the lexicon fixture page
      When I open the definition of "MSP"
      Then the definition shown is the one written for "Maison de santé pluriprofessionnelle"
      And the popup names both the abbreviation and what it stands for

    Scenario: A term that holds its own definition shows it directly
      Given I am on the lexicon fixture page
      When I open the definition of "Équipe de soins primaires"
      Then the definition shown is the one written for "Équipe de soins primaires"

  # An abbreviation is only safe to use in prose if the full entry stays
  # reachable, and the popup is deliberately short — it shows the first
  # paragraph only.
  Rule: a term with more to say links to its lexique entry

    Scenario: The link opens the lexique at the resolved term
      Given I am on the lexicon fixture page
      When I open the definition of "MSP"
      And I follow the "en savoir plus" link
      Then I am on the lexique page
      And the entry for "Maison de santé pluriprofessionnelle" is scrolled to

  # A page may name a term the lexicon does not have — a new abbreviation, or a
  # site whose lexicon does not carry it. The reader loses the explanation, not
  # the page.
  Rule: an unknown term costs the reader nothing

    Scenario: A term absent from the lexicon renders without a definition
      Given I am on the lexicon fixture page
      Then the term "INCONNU" is still shown in the prose
      And opening it offers no definition

  # Each "?" is its own popup. They share a component, and a target id that was
  # not unique would open the first popup wherever the reader clicked.
  Rule: repeated terms open independently

    Scenario: The same term twice opens the definition next to the one clicked
      Given I am on the lexicon fixture page
      When I open the second definition of "MSP"
      Then exactly one definition is open
