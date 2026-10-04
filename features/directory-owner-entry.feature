Feature: A directory may leave its organization's entry out of its lists

  A directory is owned by the organization's entry, which is also one of its
  members, so it shows in the address book and its place on /sites. Some
  directories should not list it.

  The switch belongs to the directory, not to the entry: two directories may
  share an owner (santelyon3 and its mental-health directory do), and hiding
  the entry from one must not hide it from the other. It hides, it does not
  unlink: the entry's own page stays reachable, and redeem-email claiming
  still walks the membership. Absent means listed, so existing directories
  keep today's behaviour.

  Only superusers change it, from the "Annuaires" page. The refusals the
  endpoint enforces, the per-directory scope and the cache clearing are tested
  in backend pytest (tests/api/test_directory_lists_owner_entry.py); this file
  covers what a person sees.

  Rule: A superuser turns the organization's entry off and on

    Background:
      Given I am signed in with the role "superuser"
      And this site's directory lists its organization's entry

    Scenario: The user menu leads to the directories page
      When I open "/"
      Then the user menu has a link to the directories page

    Scenario: Turned off, the organization's entry leaves the address book
      When I open the directories page
      And I turn off the organization's entry
      Then the address book no longer lists the organization's entry
      And the organization's entry page still opens

    # The root layout loads the entries once and client-side navigation keeps
    # them, so a page reached by a link after the change used to show the list
    # from before it until a full reload. Checked on the entries table, which
    # renders that same layout copy and exists on every site.
    Scenario: A page reached without reloading shows the change
      When I open the directories page
      And I turn off the organization's entry
      And I follow the user menu to the entries table, without reloading
      Then the entries table does not list the organization's entry

    Scenario: Turned back on, it returns at once
      Given this site's directory does not list its organization's entry
      When I open the directories page
      And I turn on the organization's entry
      Then the address book lists the organization's entry

  Rule: Nobody but a superuser reaches the page

    Scenario Outline: A <role> is refused
      Given I am signed in with the role "<role>"
      When I open "/web/directories"
      Then the response status is 403

      Examples:
        | role          |
        | administrator |
        | staff         |

    Scenario: An administrator's menu has no link to it
      Given I am signed in with the role "administrator"
      When I open "/"
      Then the user menu has no link to the directories page
