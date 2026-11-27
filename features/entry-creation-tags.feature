@entry-creation-flow
Feature: Tagging an entry while creating it

  A tag category belongs to the occupations it describes: "mention IPA" lists
  the mentions an infirmier en pratique avancée may hold, and says nothing
  about anyone else. An entry of such an occupation without its tags is
  incomplete — it cannot be found by mention in the address book — and the
  moment the person creating it knows them best is when they have just chosen
  the occupation.

  So the creation page asks for them right there, as part of the occupation
  step: the occupation's own categories, their tags shown at once, with no
  category to choose first. It may be skipped — the tags can be added later on
  the entry page — but confirming is what the step invites, and the next
  question waits until one or the other is done.

  An occupation without tag categories is asked nothing more, which is what
  "Creating an entry, step by step" already pins.

  Written against the link rather than a named occupation: categories, their
  tags and the occupations they belong to are reference data that grows.

  The tag "@entry-creation-flow" makes that feature's cleanup remove the person
  and the entry each scenario creates.

  Background:
    Given a person and a facility created by a staff member of this site
    And this directory offers an occupation that has tag categories

  Rule: the tags of the occupation are offered as soon as it is chosen

    Scenario Outline: A <role> is offered the occupation's tags, without a category to choose
      Given I am signed in with the role "<role>"
      When I start creating an entry
      And I choose that facility
      And I choose that tagged occupation
      Then the tags of its categories are offered at once
      And no tag category is asked for
      And the person question waits for the tags

      Examples:
        | role          |
        | staff         |
        | administrator |

  Rule: the tags chosen are recorded with the entry

    Scenario: The tags confirmed during creation are on the new entry
      Given I am signed in with the role "staff"
      When I start creating an entry
      And I choose that facility
      And I choose that tagged occupation
      And I choose one of its tags and confirm the tags
      And I choose that person among the existing ones
      And I confirm the creation
      Then I am on the new entry's page
      And the new entry carries the tag chosen

    Scenario: Skipping the tags creates the entry without any
      Given I am signed in with the role "staff"
      When I start creating an entry
      And I choose that facility
      And I choose that tagged occupation
      And I skip the tags
      And I choose that person among the existing ones
      And I confirm the creation
      Then I am on the new entry's page
      And the new entry carries no tag
