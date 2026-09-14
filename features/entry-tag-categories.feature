Feature: Tagging an entry from its effector type's categories

  A tag category belongs to one or more effector types: the category node in
  the graph carries `effector_types`, and that link is what decides whether the
  category means anything for a given entry. "mention IPA" describes the five
  mentions an infirmier en pratique avancée may hold; it says nothing about a
  médecin généraliste, and offering it there would invite a tag the profession
  does not have.

  So the tag dialog is not a flat list of every tag in the database. Choosing a
  category narrows the tag dropdown to that category's tags, and the categories
  worth choosing are the ones linked to the entry's own effector type.

  Written against the link rather than against "IPA" and "five": categories and
  their tags are reference data that grows — a new profession, a new mention —
  and a scenario naming today's contents would have to be edited every time the
  address book learns a word. What must not change is that a category offers
  exactly its own tags, and that they reach an entry of the linked type.

  Background:
    Given the address book has a tag category linked to an effector type

  Rule: a user who may edit the entry can reach the tag dialog

    # Staff hold create rights but not blanket edit rights; what lets them edit
    # this entry is being answerable for it. Administrator is the simplest role
    # that is answerable for every entry, so the dialog is asserted with that
    # and the narrower case is left to the authorization features.
    Scenario: The tag dialog is offered on an entry of that effector type
      Given I am signed in with the role "administrator"
      When I open an entry whose effector type has tag categories
      And I turn on edit mode
      Then the tag dialog can be opened

  Rule: choosing a category offers exactly that category's tags

    Scenario: The tag dropdown lists the category's tags
      Given I am signed in with the role "administrator"
      And I have opened the tag dialog on an entry of that effector type
      When I choose that tag category
      Then the tag dropdown offers exactly the tags of that category

    # The count is read from the API in the same run rather than written here:
    # five mentions IPA today, and the scenario must still describe the rule
    # when there are six.
    Scenario: Every tag offered belongs to the chosen category
      Given I am signed in with the role "administrator"
      And I have opened the tag dialog on an entry of that effector type
      When I choose that tag category
      Then every tag offered is one the API returns for that category
