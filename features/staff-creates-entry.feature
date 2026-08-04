Feature: A staff user builds their first entry

  The address book is a collaborative tool: it is filled in by the people it
  describes, not by an administrator working through a list. Creating an entry
  — a facility, an occupation and a person — is typically a staff user's first
  act in the application, so it must not require anyone else's help.

  This is why staff hold create rights (permission 3 on facilities_v2 and
  entries_v2) without holding edit rights. The two are deliberately separate:
  *any* staff user may create a facility, but once it exists only *certain*
  people may modify it — those answerable for it, namely

    * whoever owns or created the facility,
    * whoever owns or created an entry located at it,
    * and every administrator or superuser of the site, by role.

  Any other staff user, however senior in the organisation, is turned away.

  Rule: a staff user can create a facility

    Scenario: The facility creation form is offered while creating an entry
      Given I am signed in with the role "staff"
      When I start creating an entry
      Then I can create a facility from there

    Scenario: A staff user creates a facility through the API
      Given I am signed in with the role "staff"
      When I create a facility through the API
      Then the facility is created

  Rule: creating a facility makes you answerable for it

    # Creation records the author as owner and creator, which is what later
    # lets them edit it: not their rank, but their connection to it.
    Scenario: The creator is recorded as owner of the facility
      Given I am signed in with the role "staff"
      And I have created a facility through the API
      Then I am recorded among the people answerable for that facility

    # Asserted against the permission itself rather than against the buttons on
    # the facility page: a facility only gets a page once an active entry with
    # an occupation is attached to it and it sits in a commune, none of which
    # exists a moment after creation. The right to edit does exist from the
    # first moment, and that is what this rule is about.
    Scenario: The creator may edit the facility they made
      Given I am signed in with the role "staff"
      And I have created a facility through the API
      Then the page is told I may edit that facility

    Scenario: The creator may picture the facility they made
      Given I am signed in with the role "staff"
      And I have created a facility through the API
      When I upload a facility picture through the API
      Then the upload is accepted

  Rule: creating does not grant editing anything else

    # The whole point of separating create from edit: a collaborative tool must
    # let everyone contribute without letting anyone rewrite their neighbours.
    Scenario: A staff user cannot edit a facility they had no part in
      Given I am signed in as a staff member with no entry at a facility of this site
      When I open the facility page for that facility
      Then I do not see the edit facility button
      And I do not see the "add picture" button
