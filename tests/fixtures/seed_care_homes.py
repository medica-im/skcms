"""Give a directory one EHPAD and one USLD entry, deterministically.

Run inside the backend's django container:
    DIRECTORY=opale_sud python manage.py shell < tests/fixtures/seed_care_homes.py

Why
---
`tests/sites/carehome-pages.spec.ts` covers a real regression: an entry page
picks its component from the effector type's slug, and `CareHomePage` once
passed `{fullentry, memberships}` where `UsldPage` passed the fullentry itself,
so every USLD entry answered 500 while every EHPAD one was fine. Nothing in the
type system caught it — `data` is untyped `$props()` on both sides.

But the spec discovered its subjects by asking the live API which entries
existed, and skipped when it found none. On the dev database there is no
`ehpad` or `usld` EffectorType at all, so the branch that broke was never
visited: the spec reported a skip, which reads as a pass. It only ever meant
anything against a tenant whose data happened to include a care home.

So the data is created here instead. The types and the shape are taken from
staging, where the real entries live (`opale_sud`, 18 EHPAD and 1 USLD).

Idempotent: re-running verifies and tops up rather than duplicating, matching
seed_worker_sites.py, so only the first run pays.

What it creates
---------------
Per slug (`ehpad`, `usld`):

* the `EffectorType`, if the graph has none. These are reference data — a real
  deployment has them already — so this creates one only where it is missing,
  and never touches an existing one. `seed_worker_sites.py` explains why types
  are shared rather than copied: every name/label/slug field is uniquely
  indexed, so a second copy cannot coexist with the original.
* a `CareHome` effector, which is what carries the bed counts. This is the part
  the pages actually read: `UsldPage` renders `data.careHomeData
  .usld_permanent_bed`, so an effector without it renders a page missing the
  block under test — a green test over a broken feature.
* an `Entry` joining the two, on the named Directory and at the site's own
  facility, so the entries query's geography chain resolves.

Bed counts are random in 0..100 but seeded from the slug, so a run is
reproducible and two runs agree. The range covers what real entries carry —
staging's USLD has 60 beds. The numbers are not what is under test — that
the page renders them at all is — and a fixed 42 everywhere would hide a
component that printed a constant.
"""
import os
import random

from django.contrib.sites.models import Site
from neomodel import db

from directory.models.core import Directory

DIRECTORY_NAME = os.environ.get("DIRECTORY", "opale_sud")

# Taken from staging, where the real entries are. The label is what the entry
# page shows as the type, so it has to read the way the real one does.
CARE_HOME_TYPES = {
    "ehpad": {
        "name_fr": "EHPAD",
        "label_fr": "EHPAD",
        "definition_fr": (
            "Établissement d'hébergement pour personnes âgées dépendantes."
        ),
    },
    "usld": {
        "name_fr": "Unité de soins de longue durée",
        "label_fr": "USLD",
        "definition_fr": "Unité de soins de longue durée.",
    },
}

# The bed fields CareHome declares (directory/models/agraph.py). Seeded per slug
# so every field the components may read carries a plausible number, rather than
# only the one the current markup happens to print.
BED_FIELDS = (
    "regular_permanent_bed",
    "regular_temporary_bed",
    "alzheimer_permanent_bed",
    "alzheimer_temporary_bed",
    "uvpha_permanent_bed",
    "uhr_permanent_bed",
    "day_care",
    "usld_permanent_bed",
)


def beds(slug):
    """Bed counts for one slug: random in 0..100, reproducible across runs."""
    rng = random.Random(f"care-home-{slug}")
    counts = {field: rng.randint(0, 100) for field in BED_FIELDS}
    # The field the page under test reads must not be zero, or the block it
    # renders is absent and the assertion passes over a page missing it.
    counts["usld_permanent_bed" if slug == "usld" else "regular_permanent_bed"] = (
        rng.randint(1, 100)
    )
    return counts


directory = Directory.objects.get(name=DIRECTORY_NAME)
site = Site.objects.get(directories=directory)
print(f"seeding care homes into {directory.name} ({site.domain})")

# A facility on this directory, for the geography chain the entries query walks.
# Reusing an existing one rather than building a second: the chain is identical
# for every entry in the same commune, and a facility of our own would need the
# whole tree — Commune, DepartmentOfFrance, Country.
#
# The commune edge is LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY, the
# Wikidata property name, not the IN_COMMUNE one might expect.
rows, _ = db.cypher_query(
    """
    MATCH (d:Directory {name: $dir})-[:HAS_ENTRY]->(:Entry)-[:HAS_FACILITY]->(f:Facility)
    MATCH (f)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(:Commune)
    RETURN f.uid LIMIT 1
    """,
    {"dir": directory.name},
)
assert rows, (
    f"no facility with a commune on directory {directory.name}; "
    "the entries query needs the geography chain, so there is nothing to attach to"
)
facility_uid = rows[0][0]

for slug, fields in CARE_HOME_TYPES.items():
    # The type, only if the graph has none. Uniquely indexed on every name
    # field, so MERGE on the slug and leave an existing one untouched.
    rows, _ = db.cypher_query(
        "MATCH (t:EffectorType {slug_fr: $slug}) RETURN t.uid", {"slug": slug}
    )
    if rows:
        type_uid = rows[0][0]
        print(f"  {slug}: EffectorType exists ({type_uid})")
    else:
        rows, _ = db.cypher_query(
            """
            CREATE (t:EffectorType {
                uid: randomUUID(), slug_fr: $slug, name_fr: $name,
                label_fr: $label, definition_fr: $definition
            })
            RETURN t.uid
            """,
            {
                "slug": slug,
                "name": fields["name_fr"],
                "label": fields["label_fr"],
                "definition": fields["definition_fr"],
            },
        )
        type_uid = rows[0][0]
        print(f"  {slug}: EffectorType created ({type_uid})")

    entry_slug = f"e2e-{slug}"
    counts = beds(slug)

    # One entry per slug, keyed by its own slug so a re-run finds it. The
    # effector carries the bed counts and is relabelled CareHome, which is what
    # the API serialises into careHomeData.
    db.cypher_query(
        """
        MATCH (d:Directory {name: $dir})
        MATCH (t:EffectorType {uid: $type_uid})
        MATCH (f:Facility {uid: $facility_uid})
        MERGE (e:Entry {slug: $entry_slug})
          ON CREATE SET e.uid = randomUUID(), e.active = true,
                        e.createdAt = timestamp(), e.updatedAt = timestamp()
        SET e.active = true, e.e2eCareHome = true
        MERGE (d)-[:HAS_ENTRY]->(e)
        MERGE (e)-[:HAS_EFFECTOR_TYPE]->(t)
        MERGE (e)-[:HAS_FACILITY]->(f)
        MERGE (e)-[:HAS_EFFECTOR]->(ef:Effector:CareHome {slug_fr: $effector_slug})
          ON CREATE SET ef.uid = randomUUID()
        SET ef.name_fr = $name, ef.label_fr = $label,
            ef.updatedAt = timestamp(),
            ef += $counts
        RETURN e.slug
        """,
        {
            "dir": directory.name,
            "type_uid": type_uid,
            "facility_uid": facility_uid,
            "entry_slug": entry_slug,
            "effector_slug": f"e2e-{slug}-effector",
            "name": f"{fields['label_fr']} de test",
            "label": f"{fields['label_fr']} de test",
            "counts": counts,
        },
    )
    bed_field = "usld_permanent_bed" if slug == "usld" else "regular_permanent_bed"
    print(f"    entry {entry_slug}: {bed_field}={counts[bed_field]}")

# Say what the spec will find, so a run that seeded nothing is visible here
# rather than as a skip three layers away.
rows, _ = db.cypher_query(
    """
    MATCH (d:Directory {name: $dir})-[:HAS_ENTRY]->(e:Entry {e2eCareHome: true})
          -[:HAS_EFFECTOR_TYPE]->(t:EffectorType)
    MATCH (e)-[:HAS_EFFECTOR]->(ef:CareHome)
    RETURN t.slug_fr, e.slug, ef.usld_permanent_bed, ef.regular_permanent_bed
    ORDER BY t.slug_fr
    """,
    {"dir": directory.name},
)
print("seeded:")
for slug, entry_slug, usld_beds, regular_beds in rows:
    print(f"  {slug}: /e/{entry_slug} usld={usld_beds} regular={regular_beds}")
assert len(rows) == len(CARE_HOME_TYPES), (
    f"expected {len(CARE_HOME_TYPES)} care home entries, found {len(rows)}"
)
