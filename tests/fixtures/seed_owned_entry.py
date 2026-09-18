"""Give one entry a known owner and a known creator.

Run inside the backend's django container:
    SEED_SITE_DOMAIN=dev.unipa.fr python manage.py shell < tests/fixtures/seed_owned_entry.py

Why
---
`tests/sites/entry-owner-panel.spec.ts` proves that an entry with an owner names
that owner on the first page load. It needs an entry whose ownership is known,
and live data cannot supply one: ownership is reassigned in the course of using
the app, so a spec pinned to a real row passes or fails on who happens to own it
today — and the reported bug was found on exactly such a row.

So the subject is made here. The owner is the seeded superuser account that
tests/fixtures/seed_test_users.py already creates and that the session fixture
signs JWTs for, which means the spec's viewer and the entry's owner are both
known quantities rather than whoever is logged in.

Idempotent, like the other fixtures: re-running verifies and re-points rather
than duplicating.

What it does
------------
* Finds the first active entry on this site's directory with an effector and a
  facility — it has to be a page that renders, not a bare node.
* Points OWNED_BY and CREATED_BY at the seeded superuser, replacing whatever
  they pointed at. The direction is `(Entry)-[:OWNED_BY]->(User)`, as
  directory/models/agraph.py declares (`owner = AsyncRelationshipTo(User,
  'OWNED_BY')`) — seeded the other way round the edges exist and the API reads
  none of them, which looks exactly like the bug under test.
* Prints the slug the spec should visit, so a changed fixture is visible here
  rather than as a 404 three layers away.
"""
import os

from django.contrib.sites.models import Site
from neomodel import db

from directory.utils import get_directory_for_site
from facility.models import Organization

SITE_DOMAIN = os.environ.get("SEED_SITE_DOMAIN", "dev.unipa.fr")

# The owner is its own account, deliberately *not* one of the `e2e-sub-` roles.
#
# tests/globalSetup.ts deletes every OWNED_BY and CREATED_BY edge pointing at an
# account whose sub starts with `e2e-sub-`, before every run and by design: a
# leftover ownership link makes the scenarios about a staff member *unconnected*
# to a facility exercise one who is connected, so they pass while proving the
# opposite of their name.
#
# Owning an entry with the seeded superuser therefore cannot work — the fixture
# writes the edges and the suite's own cleanup removes them seconds later, which
# is exactly what happened while this was being written. A separate account with
# a sub outside that prefix is owned by this fixture alone.
OWNER_EMAIL = "owner-fixture@example.test"
OWNER_SUB = "fixture-sub-owner"
OWNER_NAME = "Fixture Owner"

site = Site.objects.get(domain=SITE_DOMAIN)
directory = get_directory_for_site(site)
print(f"seeding an owned entry on {site.domain} (directory {directory.name})")

# The owner, with an active Access on this site's organization Entry.
#
# That access is not decoration: GET /api/v2/users/{uid} — the request the panel
# makes for each owner — matches
# `(u:User)-[:HAS_ACCESS]->(:Access {active:true})-[:ACCESS_TO]->(:Entry {uid:
# <org entry>})` and 404s when it finds nothing. A user who owns an entry but
# holds no access on the site is therefore unresolvable, and the panel drops the
# row and says "aucun utilisateur associé" — which is the reported bug, and is a
# state real data can reach whenever somebody's access is revoked while they
# still own entries.
organization_entry_uid = Organization.objects.get(site=site).neomodel_uid.hex

db.cypher_query(
    """
    MERGE (u:User {email: $email})
      ON CREATE SET u.uid = randomUUID(), u.name = $name
    SET u.name = $name
    MERGE (a:Account {sub: $sub})
      ON CREATE SET a.uid = randomUUID()
    MERGE (u)-[:HAS_ACCOUNT]->(a)
    """,
    {"email": OWNER_EMAIL, "sub": OWNER_SUB, "name": OWNER_NAME},
)
db.cypher_query(
    """
    MATCH (u:User {email: $email})
    MATCH (e:Entry {uid: $org_entry})
    MERGE (u)-[:HAS_ACCESS]->(ac:Access {role: $role})-[:ACCESS_TO]->(e)
      ON CREATE SET ac.uid = randomUUID()
    SET ac.active = true
    """,
    {"email": OWNER_EMAIL, "org_entry": organization_entry_uid, "role": "staff"},
)

# A renderable entry: one that has both an effector and a facility, since the
# page reads from each and a node missing either 500s rather than showing a
# panel. Ordered by slug so the choice is the same on every run.
rows, _ = db.cypher_query(
    """
    MATCH (d:Directory {name: $dir})-[:HAS_ENTRY]->(e:Entry)
    WHERE e.active = true AND e.slug IS NOT NULL
    MATCH (e)-[:HAS_EFFECTOR]->(:Effector)
    MATCH (e)-[:HAS_FACILITY]->(:Facility)
    RETURN e.uid, e.slug ORDER BY e.slug LIMIT 1
    """,
    {"dir": directory.name},
)
assert rows, f"no renderable active entry on directory {directory.name}"
entry_uid, entry_slug = rows[0]

# Point ownership at the seeded user, dropping whatever it was.
#
# Three statements rather than one. Chaining `OPTIONAL MATCH ... DELETE ... WITH
# e` looked tidier and wrote nothing at all: the row carrying `e` did not
# survive the chain, so the MERGE at the end never ran — and the script still
# printed success, because its own verification query ran separately. Separate
# statements each either do their work or fail visibly.
db.cypher_query(
    """
    MATCH (e:Entry {uid: $entry_uid})-[r:OWNED_BY]->(:User)
    DELETE r
    """,
    {"entry_uid": entry_uid},
)
db.cypher_query(
    """
    MATCH (e:Entry {uid: $entry_uid})-[r:CREATED_BY]->(:User)
    DELETE r
    """,
    {"entry_uid": entry_uid},
)
db.cypher_query(
    """
    MATCH (e:Entry {uid: $entry_uid})
    MATCH (u:User {email: $email})
    MERGE (e)-[:OWNED_BY]->(u)
    MERGE (e)-[:CREATED_BY]->(u)
    """,
    {"entry_uid": entry_uid, "email": OWNER_EMAIL},
)

# Report what the spec will find, and fail here if the graph disagrees.
rows, _ = db.cypher_query(
    """
    MATCH (:Entry {uid: $entry_uid})-[:OWNED_BY]->(u:User)
    RETURN u.email, u.uid
    """,
    {"entry_uid": entry_uid},
)
assert len(rows) == 1, f"expected exactly one owner, found {rows}"
print(f"  entry  /e/{entry_slug}")
print(f"  owner  {rows[0][0]} ({rows[0][1]})")
print(f"  visit  https://{site.domain}/e/{entry_slug}")
