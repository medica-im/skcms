Feature: Picturing a facility

  A facility can be given a photograph of the place it occupies, so patients
  recognize the building when they arrive. Whoever may edit a facility may also
  picture it: the button sits under the edit button and answers to the same
  permission, so there is no second rule to keep in step.

  The picture is wide (16:9), not square like an avatar. A building is
  recognized by its facade or its entrance, and a 1:1 crop removes exactly
  that. It is stored apart from personal avatars — a Contact is a person, not
  a place — and has its own 16:9 renditions.

  Rule: being connected to the facility is what grants the picture

    # What authorizes the upload is the connection, not the rank: someone who
    # owns or created an entry at this facility may picture it whatever their
    # role. Administrators of the organisation answer for every facility of
    # their site, so they may picture any of them.
    Scenario: Someone who owns an entry at the facility may picture it
      Given I am signed in as the owner of an entry at a facility of this site
      When I open the facility page for that facility
      Then I see the "add picture" button under the edit facility button

    # The facility's own creator, as distinct from the owner of an entry at it.
    # Someone who added the address to the directory answers for it even before
    # anyone practises there.
    Scenario: Someone who created the facility may picture it
      Given I am signed in as the creator of a facility of this site
      When I open the facility page for that facility
      Then I see the "add picture" button under the edit facility button

    Scenario: Someone who created the facility may upload through the API
      Given I am signed in as the creator of a facility of this site
      When I upload a facility picture through the API
      Then the upload is accepted

    # The page cannot work this out for itself — it knows the role but not the
    # connection — so it asks the server, which answers with the same rule it
    # would apply to a save. Button and server can then never disagree.
    Scenario: The page is told that someone connected may edit
      Given I am signed in as the owner of an entry at a facility of this site
      Then the page is told I may edit that facility

    Scenario Outline: An administrator of the site may picture any of its facilities
      Given I am signed in with the role "<role>"
      And I open the facility page for a facility of this site
      Then I see the "add picture" button under the edit facility button

      Examples:
        | role          |
        | administrator |
        | superuser     |

    # The button's presence is not the whole story: the gate is server-side.
    Scenario Outline: An administrator may upload through the API
      Given I am signed in with the role "<role>"
      When I upload a facility picture through the API
      Then the upload is accepted

      Examples:
        | role          |
        | administrator |
        | superuser     |

  Rule: a staff member unconnected to the facility may not picture it

    # Belonging to the organisation is not enough: a facility is answered for by
    # the people practising there. Otherwise any member of a large site could
    # replace the photograph of a practice they have nothing to do with.
    Scenario: A staff member with no entry at the facility is offered no button
      Given I am signed in as a staff member with no entry at a facility of this site
      When I open the facility page for that facility
      Then I do not see the "add picture" button

    Scenario: A staff member with no entry at the facility cannot upload through the API
      Given I am signed in as a staff member with no entry at a facility of this site
      When I upload a facility picture through the API
      Then the request is refused

    # The page cannot work this out for itself — it knows the role but not the
    # connection — so it asks the server, which answers with the same rule it
    # would apply to a save. Button and server can then never disagree.
    Scenario: The page is told that an unconnected staff member may not edit
      Given I am signed in as a staff member with no entry at a facility of this site
      Then the page is told I may not edit that facility

  Rule: someone who may not edit the facility may not picture it

    Scenario: A signed-out visitor is offered neither button
      Given I am signed out
      And I open the facility page for a facility of this site
      Then I do not see the "add picture" button
      And I do not see the edit facility button

    # Read-only on facilities_v2 (permission 1), so the picture is out of reach
    # even though the visitor is signed in.
    Scenario: A signed-in visitor without edit rights is offered no button
      Given I am signed in with the role "registered"
      And I open the facility page for a facility of this site
      Then I do not see the "add picture" button

    # The gate is server-side, so the button's absence is not the whole story:
    # a visitor who calls the endpoint directly must be refused too.
    Scenario Outline: Someone without edit rights cannot upload through the API
      Given I am signed in as "<who>"
      When I upload a facility picture through the API
      Then the request is refused

      Examples:
        | who        |
        | signed out |
        | registered |

  Rule: the dialog explains what makes a good picture

    Scenario: The guidance is shown before a file is chosen
      Given I am signed in as the owner of an entry at a facility of this site
      And I open the facility page for that facility
      When I open the place picture dialog
      Then the dialog explains what to photograph
      And the dialog offers a description field for the image

    # The access selector belongs to avatars: a photograph of a building is
    # public, and offering the choice would suggest otherwise.
    Scenario: The dialog does not ask who may see the picture
      Given I am signed in as the owner of an entry at a facility of this site
      And I open the facility page for that facility
      When I open the place picture dialog
      Then the dialog does not offer an access level

  Rule: the picture is cropped to 16:9

    Scenario: The cropper is locked to a wide selection
      Given I am signed in as the owner of an entry at a facility of this site
      And I open the facility page for that facility
      And I open the place picture dialog
      When I choose an image file
      Then the crop selection has a 16:9 ratio

    Scenario Outline: An image of the wrong shape is refused by the API
      Given I am signed in as the owner of an entry at a facility of this site
      When I upload a "<shape>" facility picture through the API
      Then the upload is refused because the shape is wrong

      Examples:
        | shape    |
        | square   |
        | portrait |

    Scenario: An image too small to render well is refused
      Given I am signed in as the owner of an entry at a facility of this site
      When I upload a facility picture measuring 320x180
      Then the upload is refused because the image is too small

  Rule: the description can be corrected without replacing the picture

    # Pictures migrated from the old storage arrived with no description at all,
    # and a photograph nobody can see is useless to a visitor using a screen
    # reader. Writing one must not require finding and re-uploading the original
    # file.
    Scenario: Adding a description to a picture that has none offers to save it
      Given the facility of this site has a place picture without a description
      And I am signed in as the owner of an entry at that facility
      And I open the facility page for that facility
      And I open the place picture dialog
      When I write a description for the picture
      Then the dialog offers to save the change

    # Nothing has changed yet, so there is nothing to save: an enabled button
    # would invite a pointless round trip to the server.
    Scenario: An untouched dialog offers nothing to save
      Given the facility of this site has a place picture without a description
      And I am signed in as the owner of an entry at that facility
      And I open the facility page for that facility
      When I open the place picture dialog
      Then the dialog does not offer to save anything

    Scenario: The new description reaches the facility
      Given the facility of this site has a place picture without a description
      And I am signed in as the owner of an entry at that facility
      And I open the facility page for that facility
      And I open the place picture dialog
      When I write a description for the picture
      And I save the change
      Then the facility picture carries that description

  Rule: the picture appears on the facility once uploaded

    Scenario: The button offers to modify an existing picture
      Given I am signed in as the owner of an entry at a facility of this site
      And the facility of this site has a place picture
      When I open the facility page for that facility
      Then the button offers to modify the picture rather than add one

    Scenario: The picture is served in its wide renditions
      Given the facility of this site has a place picture
      When I read that facility from the API
      Then the facility carries a place image
      And the place image is separate from the avatar

  Rule: a picture can be removed

    Scenario: Deleting leaves the facility without a picture
      Given I am signed in as the owner of an entry at a facility of this site
      And the facility of this site has a place picture
      When I delete the facility picture through the API
      Then the facility carries no place image
