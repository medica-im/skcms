Feature: Deleting a facility

  A facility is an address where people practise. Deleting one that still has
  an entry would leave those practitioners with an address that no longer
  resolves, and the visitors looking for them with a dead link.

  Deactivating an entry is not enough to free its facility: deactivation is
  reversible and keeps the entry's history, so reactivating it would resurrect
  an address that no longer exists. The entry has to be deleted outright.

  This is not a permission: it does not depend on who is asking. A superuser is
  refused just like anyone else, because the objection is to the state of the
  data, not to the person. It is enforced in the serializer layer and answered
  with 409 Conflict — a permission would have to be repeated for every role,
  and the object-level authorization path would slip past it.

  Rule: a facility still in use cannot be deleted

    # Signed in as a superuser on purpose: rank must not help here. If this
    # scenario ever passes by granting someone a higher role, the rule has been
    # turned back into a permission.
    Scenario: Deleting a facility that still has an entry is refused
      Given I am signed in with the role "superuser"
      And a facility of this site has an entry
      When I delete that facility through the API
      Then the deletion is refused because the facility is still in use
      And the facility is still there

    # Deactivation is reversible, so it does not free the address: the entry
    # would come back pointing at a facility that had been deleted meanwhile.
    Scenario: Deactivating the entry is not enough to free the facility
      Given I am signed in with the role "superuser"
      And a facility of this site has a deactivated entry
      When I delete that facility through the API
      Then the deletion is refused because the facility is still in use
      And the facility is still there

    Scenario: The refusal names the entries that stand in the way
      Given I am signed in with the role "superuser"
      And a facility of this site has an entry
      When I delete that facility through the API
      Then the refusal says how many entries still use the facility

  Rule: a facility nobody uses can be deleted

    Scenario: A facility with no entry at all is deleted
      Given I am signed in with the role "superuser"
      And this site has a facility with no entry
      When I delete that facility through the API
      Then the deletion is accepted
      And the facility is gone

    # Deleting the entry outright is what frees the address, deactivating it is
    # not.
    Scenario: A facility is deleted once its entries have been deleted
      Given I am signed in with the role "superuser"
      And a facility of this site has an entry
      And that entry is deleted
      When I delete that facility through the API
      Then the deletion is accepted
      And the facility is gone

  Rule: deleting is still subject to the usual permissions

    # The invariant above is an extra condition, not a replacement: someone who
    # may not delete a facility is still turned away for that reason first.
    Scenario: A signed-out visitor cannot delete a facility
      Given I am signed out
      When I delete a facility of this site through the API
      Then the request is refused
