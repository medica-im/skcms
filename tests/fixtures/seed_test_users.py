"""Seed Neo4j test users, one per role, for Playwright BDD runs.

Creates (or reuses) a User + Account + Access node per role, scoped to the
organization Entry of the given site. The Account.sub values are what the
storage-state fixture puts in the Auth.js JWT, so the backend resolves the
intended role for each browser session.

Run inside the backend's django container:
    python manage.py shell < tests/fixtures/seed_test_users.py
"""
from neomodel import db
from django.contrib.sites.models import Site
from facility.models import Organization

SITE_DOMAIN = "dev.santelyon3.fr"

# sub values are arbitrary but must be stable: the fixture signs them into JWTs.
TEST_USERS = [
    ("e2e-superuser@example.test", "e2e-sub-superuser", "superuser"),
    ("e2e-administrator@example.test", "e2e-sub-administrator", "administrator"),
    ("e2e-staff@example.test", "e2e-sub-staff", "staff"),
    ("e2e-registered@example.test", "e2e-sub-registered", "registered"),
]

site = Site.objects.get(domain=SITE_DOMAIN)
entry_uid = Organization.objects.get(site=site).neomodel_uid.hex

for email, sub, role in TEST_USERS:
    db.cypher_query(
        """
        MERGE (u:User {email: $email})
          ON CREATE SET u.uid = randomUUID(), u.name = $email
        MERGE (a:Account {sub: $sub})
          ON CREATE SET a.uid = randomUUID()
        MERGE (u)-[:HAS_ACCOUNT]->(a)
        WITH u
        MATCH (e:Entry {uid: $entry_uid})
        MERGE (u)-[:HAS_ACCESS]->(ac:Access {role: $role})-[:ACCESS_TO]->(e)
          ON CREATE SET ac.uid = randomUUID()
        SET ac.active = true
        """,
        {"email": email, "sub": sub, "role": role, "entry_uid": entry_uid},
    )
    print(f"seeded {role:14} {email}  sub={sub}")

print(f"entry_uid={entry_uid}")
