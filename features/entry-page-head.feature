Feature: An entry page tells search engines who it is and where it lives

  An entry page's canonical link is the address search engines index it
  under, so it must be the public address the visitor is on, base path
  included. It used to be built from the backend's address: every entry page
  on unipa.fr/annuaire declared https://ipa.medica.im/e/<slug> as its real
  address -- another host, without /annuaire, answering with a redirect --
  and Search Console reported redirect errors (found 27 Sep 2026).

  The title is what the browser tab and the search result headline show, so
  it starts with who the entry is; the description carries the rest. Entry
  pages used to have neither, and a person working in two places had two
  pages search engines could not tell apart.

  These run on a base-path site as well as a root one: a URL built without the
  prefix only goes wrong under a base path.

  Background:
    Given an entry of my own exists on the site

  Scenario: The canonical link is the page's own public address
    When I open that entry's page
    Then its canonical link is its public address, base path included

  Scenario: The page has a title and a description that name the entry
    When I open that entry's page
    Then the page title starts with the entry's name
    And the page description starts with the entry's name
