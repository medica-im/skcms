"""Create one Site per Playwright worker, each with its own data.

Run inside the backend's django container:
    WORKERS=4 python manage.py shell < tests/fixtures/seed_worker_sites.py

Why
---
The backend resolves which Site a request belongs to from the request hostname
(``get_site_from_request`` in ``api/utils.py``). With every worker browsing one
hostname, all four shared one Site — so scenarios mutating an entry, an avatar
or a facility contended over the same rows, and ``clearApiCache()`` (a global
Redis flush) could drop one worker's payload between another's write and read.
That was patched around with ``@mode:serial``, worker-scoped seed tags and
per-scenario cloning; none of it removes the shared resource.

Giving each worker its own hostname — ``w0.dev.medica.im`` … — gives it its own
Site, Directory, Organization and entries. Nothing is left to contend over.

Idempotent, and deliberately so: the sites are left in place between runs, so
only the first run pays for creating them. Re-running verifies and tops up.

What each worker site gets
--------------------------
A minimal but *renderable* dataset, modelled on gadagne (whose Directory and
Organization this copies its shape from):

* a ``Directory`` (``e2e-wN``) and an ``Organization`` (category ``msp``, so the
  data-driven home page picks the same branch as gadagne)
* an organization ``Entry`` in Neo4j, which ``Organization.neomodel_uid`` points
  at — the role system scopes access to it, so ``seed_test_users.py`` needs it
* a ``Facility`` with the full geography chain the entries query requires
  ``(Facility)->(Commune)->(DepartmentOfFrance)->(Country)``
* a handful of entries across two effector types, some with avatars

Reference data (``Commune``, ``DepartmentOfFrance``, ``Country``,
``EffectorType``) is *shared* with the real dataset rather than copied:
``EffectorType`` has a uniqueness constraint on every name/label/slug field, so
a copy could not coexist with the original, and the geography is identical for
every site in the same department anyway.
"""
import os

from django.contrib.sites.models import Site
from neomodel import db

from addressbook.models import Contact
from directory.models.core import Directory
from facility.models import Organization, PlaceImage

WORKERS = int(os.environ.get("WORKERS", "4"))
DOMAIN_TEMPLATE = os.environ.get("WORKER_DOMAIN_TEMPLATE", "w{i}.dev.medica.im")

# Copied from the gadagne site so the worker sites render the same way.
TEMPLATE_SITE_DOMAIN = os.environ.get("TEMPLATE_SITE_DOMAIN", "dev.sante-gadagne.fr")

template_site = Site.objects.get(domain=TEMPLATE_SITE_DOMAIN)
template_dir = Directory.objects.get(site=template_site)
template_org = Organization.objects.get(site=template_site)


def effector_type_uids(limit=4):
    """Effector types from the real dataset, shared not copied.

    Deliberately mixes types whose label is an **acronym** (all upper case, e.g.
    "IPA", "CMP") with types whose label is an ordinary phrase. The frontend
    decides to abbreviate by testing whether the label looks like an acronym —
    ``isAcronym`` in src/lib/Organization/occupationLabel.ts, which checks for
    all-caps, not for label != name — so a worker site containing only one kind
    cannot exercise both branches of that helper.

    Note the API does not serve ``label_fr`` directly: the entries serializer
    resolves a gendered/pluralised label out of the ``Label`` table and falls
    back to the type's name (``flex_effector_type_label`` in
    api/serializers/allentries.py), which is why choosing on ``label_fr <>
    name_fr`` selected nothing useful.
    """
    rows, _ = db.cypher_query(
        """
        MATCH (t:EffectorType)
        WHERE t.name_fr IS NOT NULL AND t.slug_fr IS NOT NULL
        WITH t, coalesce(t.label_fr, t.name_fr) AS lbl
        WITH t, lbl, lbl = toUpper(lbl) AND lbl =~ '[A-ZÀ-Ý]{2,}' AS is_acronym
        RETURN t.uid, t.name_fr, is_acronym
        ORDER BY is_acronym DESC, t.name_fr
        LIMIT $limit
        """,
        {"limit": limit},
    )
    assert rows, "no effector types in the graph to attach worker entries to"
    with_acronym = [r for r in rows if r[2]]
    without = [r for r in rows if not r[2]]
    # Interleave so both kinds land in the entry list even when it is short.
    ordered = []
    for pair in zip(with_acronym or without, without or with_acronym):
        ordered.extend(pair)
    return ordered or rows


def reusable_images(kind, limit=6):
    """File names of pictures already in the media root, to reuse as-is.

    Copying an existing photograph is cheaper and more realistic than
    generating one, and the thumbnailer renditions ("…jpg.256x256_q85_…") are
    already on disk beside each original, so a reused name needs no processing.
    Only originals are returned — a rendition used as an original would be
    re-thumbnailed into a rendition of a rendition.
    """
    import os

    root = f"/srv/dev.medica.im/media/{kind}"
    try:
        names = os.listdir(root)
    except FileNotFoundError:
        return []
    originals = [
        n
        for n in sorted(names)
        if n.lower().endswith((".jpg", ".jpeg", ".png"))
        and "_q85" not in n
        and "e2eSeed" not in n
    ]
    return originals[:limit]


def commune_with_geography():
    """A Commune that already has the chain the entries query walks."""
    rows, _ = db.cypher_query(
        """
        MATCH (c:Commune)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->
              (:DepartmentOfFrance)
        RETURN c.uid LIMIT 1
        """
    )
    assert rows, "no Commune with a department chain — cannot place a facility"
    return rows[0][0]


TYPES = effector_type_uids()
COMMUNE_UID = commune_with_geography()
AVATARS = reusable_images("profile_images")
PLACE_IMAGES = reusable_images("place_images", limit=2)

for i in range(WORKERS):
    domain = DOMAIN_TEMPLATE.format(i=i)
    dir_name = f"e2e-w{i}"

    site, site_created = Site.objects.get_or_create(
        domain=domain, defaults={"name": f"E2E worker {i}"}
    )

    # The organization Entry the role system scopes Access to. Created first
    # because Organization.neomodel_uid has to point at it.
    rows, _ = db.cypher_query(
        """
        MERGE (o:Entry {slug: $slug})
          ON CREATE SET o.uid = randomUUID(), o.active = true
        SET o.name = $name, o.e2eWorkerSite = true
        RETURN o.uid
        """,
        {"slug": f"{dir_name}-organization", "name": f"E2E worker {i}"},
    )
    org_entry_uid = rows[0][0]

    directory, _ = Directory.objects.get_or_create(
        site=site,
        defaults={
            "name": dir_name,
            "slug": dir_name,
            "display_name": f"E2E worker {i}",
            "postal_codes": template_dir.postal_codes,
            "department_default": template_dir.department_default,
            "commune_default": template_dir.commune_default,
        },
    )

    organization, _ = Organization.objects.get_or_create(
        site=site,
        defaults={
            "name": dir_name,
            "category": template_org.category,
            "city": template_org.city,
            "language": template_org.language,
            "active": True,
            "sandbox": False,
            "neomodel_uid": org_entry_uid,
        },
    )
    # get_or_create leaves an existing row untouched, but the Entry uid must
    # always agree with the graph or every role lookup resolves to anonymous.
    if str(organization.neomodel_uid).replace("-", "") != org_entry_uid.replace("-", ""):
        organization.neomodel_uid = org_entry_uid
        organization.save(update_fields=["neomodel_uid"])

    # The Directory exists twice over: a Django row (created above, which is
    # what links it to the Site) and a Neo4j node of the same name, which is
    # what the entries query traverses. Creating only the Django row leaves
    # every `MATCH (d:Directory {name: …})` matching nothing, so the entries
    # below are created but attached to nothing and the API returns an empty
    # list — with no error anywhere.
    db.cypher_query(
        """
        MERGE (d:Directory {name: $dir})
          ON CREATE SET d.uid = randomUUID()
        SET d.e2eWorkerSite = true
        """,
        {"dir": dir_name},
    )

    # A facility with the geography the entries query walks, plus entries of two
    # types — some with avatars, since the team carousel only shows entries that
    # have one.
    db.cypher_query(
        """
        MATCH (commune:Commune {uid: $commune})
        MERGE (f:Facility {slug: $facility_slug})
          ON CREATE SET f.uid = randomUUID()
        SET f.name = $facility_name, f.label = $facility_name, f.e2eWorkerSite = true
        MERGE (f)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(commune)

        WITH f
        MATCH (d:Directory {name: $dir})
        MATCH (org:Entry {uid: $org_entry})
        MERGE (d)-[:HAS_ENTRY]->(org)

        WITH f, d, org
        UNWIND $entries AS spec
        MATCH (t:EffectorType {uid: spec.type})
        MERGE (e:Entry {slug: spec.slug})
          ON CREATE SET e.uid = randomUUID()
        SET e.active = true, e.name = spec.name, e.e2eWorkerSite = true

        // Delete the type edge before re-creating it. MERGE would *add* a
        // second one when this script is re-run with a different type set, and
        // the entries serializer emits one row per effector type — so an entry
        // with two types appears twice in /api/v2/entries and the team carousel
        // dies on Svelte's each_key_duplicate (it keys slides on uid). Same
        // reason the clone in seed.ts had to avoid a fan-out.
        WITH f, d, org, e, t, spec
        OPTIONAL MATCH (e)-[old:HAS_EFFECTOR_TYPE]->()
        DELETE old

        WITH f, d, org, e, t, spec
        MERGE (ef:Effector {slug_fr: spec.slug + '-effector'})
          ON CREATE SET ef.uid = randomUUID()
        SET ef.name_fr = spec.name, ef.label_fr = spec.name, ef.e2eWorkerSite = true
        MERGE (e)-[:HAS_EFFECTOR]->(ef)
        MERGE (e)-[:HAS_EFFECTOR_TYPE]->(t)
        MERGE (e)-[:HAS_FACILITY]->(f)
        MERGE (d)-[:HAS_ENTRY]->(e)
        MERGE (e)-[:MEMBER_OF]->(org)
        """,
        {
            "commune": COMMUNE_UID,
            "facility_slug": f"{dir_name}-facility",
            "facility_name": f"E2E worker {i} facility",
            "dir": dir_name,
            "org_entry": org_entry_uid,
            "entries": [
                {
                    "slug": f"{dir_name}-entry-{n}",
                    "name": f"E2E W{i} Person {n}",
                    "type": TYPES[n % len(TYPES)][0],
                }
                for n in range(6)
            ],
        },
    )

    # Avatars: the Django side of an entry, keyed on the entry uid. Point at
    # pictures already in the media root rather than generating new files — the
    # thumbnailer renditions are on disk beside each original, so nothing has to
    # be processed, and the pictures look like real ones.
    #
    # Only some entries get one, on purpose: the team carousel shows only
    # entries that have an avatar, while other scenarios need an entry without,
    # and features/avatar-access.feature needs at least one it can restrict.
    rows, _ = db.cypher_query(
        "MATCH (d:Directory {name: $dir})-[:HAS_ENTRY]->(e:Entry) "
        "WHERE e.slug <> $org_slug RETURN e.uid ORDER BY e.slug",
        {"dir": dir_name, "org_slug": f"{dir_name}-organization"},
    )
    entry_uids = [r[0] for r in rows]
    avatars_set = 0
    if AVATARS:
        for n, entry_uid in enumerate(entry_uids):
            # Two of every three entries get a picture; the rest stay bare.
            if n % 3 == 2:
                continue
            contact, _ = Contact.objects.get_or_create(neomodel_uid=entry_uid)
            if not contact.profile_image:
                contact.profile_image = f"profile_images/{AVATARS[n % len(AVATARS)]}"
            contact.avatar_access = "anonymous"
            contact.save()
            avatars_set += 1

    # A picture on the facility, so the facility scenarios have one to find and
    # the home page facility carousel has a slide.
    places_set = 0
    if PLACE_IMAGES:
        rows, _ = db.cypher_query(
            "MATCH (f:Facility {slug: $slug}) RETURN f.uid",
            {"slug": f"{dir_name}-facility"},
        )
        if rows:
            place, _ = PlaceImage.objects.get_or_create(neomodel_uid=rows[0][0])
            if not place.image:
                place.image = f"place_images/{PLACE_IMAGES[i % len(PLACE_IMAGES)]}"
                place.save()
            places_set = 1

    print(
        f"seeded {domain:<24} dir={dir_name:<8} entries={len(entry_uids)} "
        f"avatars={avatars_set} places={places_set} "
        f"{'(new site)' if site_created else '(existing)'}"
    )

print(f"WORKER_SITES_SEEDED {WORKERS}")
