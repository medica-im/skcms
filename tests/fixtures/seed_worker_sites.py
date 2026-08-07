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
from directory.models.core import Directory, InputField, Setting
from facility.models import LegalEntity, Organization, PlaceImage

WORKERS = int(os.environ.get("WORKERS", "4"))
DOMAIN_TEMPLATE = os.environ.get("WORKER_DOMAIN_TEMPLATE", "w{i}.dev.medica.im")

# Copied from the gadagne site so the worker sites render the same way.
TEMPLATE_SITE_DOMAIN = os.environ.get("TEMPLATE_SITE_DOMAIN", "dev.sante-gadagne.fr")

template_site = Site.objects.get(domain=TEMPLATE_SITE_DOMAIN)
template_dir = Directory.objects.get(site=template_site)
template_org = Organization.objects.get(site=template_site)


# Facilities the .feature files name in their steps. Kept here rather than
# discovered, because a feature naming a place is a deliberate choice — the
# scenario reads better for it — and the seeder's job is to make that name
# exist on every worker site. Add to this list when a feature starts naming a
# new one; the assertion in source_entry_uids() fails loudly if the dataset no
# longer has it, rather than leaving the scenario to fail on a missing page.
FEATURE_FACILITY_NAMES = [
    "Pharmacie des Félibres",
    "Cabinet de kinésithérapie du Bois",
]

# The per-role test accounts, defined once in seed_test_users.py.
#
# Duplicated here as a literal because both files are *piped* into
# `manage.py shell` rather than imported, so there is no module to import from.
# The Account `sub` values are the contract with tests/fixtures/session.ts,
# which mints its cookies against them — if the two lists drift, every
# authenticated scenario 401s with a valid-looking cookie.
TEST_USERS = [
    ("e2e-superuser@example.test", "e2e-sub-superuser", "superuser"),
    ("e2e-administrator@example.test", "e2e-sub-administrator", "administrator"),
    ("e2e-staff@example.test", "e2e-sub-staff", "staff"),
    ("e2e-registered@example.test", "e2e-sub-registered", "registered"),
]


# Fewer than three facilities cannot exercise the carousel's three button
# states: on the first slide only "next" is active, on the last only "previous",
# and only a *middle* slide has both. Two facilities produce no middle slide at
# all, so a regression that wrongly disables one of the buttons would pass.
#
# Each cloned entry brings its own facility, so this is also the floor for the
# number of entries copied into a worker site.
MIN_FACILITIES = 3


def source_entry_uids(limit=6):
    """Real entries to copy into each worker site.

    Copied rather than invented, because invented data is uniform in ways real
    data is not: six identical "E2E W0 Person n" rows all sort the same, all
    flex the same, and all carry the same made-up occupation, so a test can pass
    against them while the real dataset breaks. A clone brings the real name,
    the real EffectorType with its label and acronym, and the real address.

    Chosen among entries that already satisfy the chain get_entries walks
    (directory.utils.get_entries_query) — facility, commune, department and
    country — so a clone of one is renderable by construction rather than by
    the seeder reproducing that geography itself.

    Mixed across effector types, so the occupation-label branches (acronym vs
    ordinary phrase) both appear in every worker site.
    """
    rows, _ = db.cypher_query(
        """
        MATCH (entry:Entry {active: true})-[:HAS_FACILITY]->(f:Facility)
              -[]->(commune:Commune)
              -[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(:DepartmentOfFrance)
              -[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY*]->(:Country)
        MATCH (entry)-[:HAS_EFFECTOR]->(:Effector)
        MATCH (entry)-[:HAS_EFFECTOR_TYPE]->(t:EffectorType)
        WHERE f.location IS NOT NULL AND coalesce(entry.e2eWorkerSite, false) = false
        // One entry per facility, so the copies land in as many distinct places
        // as possible: scenarios assert that two facilities never share an
        // address, and that facility links on the home page are unique, neither
        // of which a single shared facility can satisfy.
        WITH f, collect(DISTINCT entry.uid) AS uids, collect(DISTINCT t.uid) AS types
        RETURN uids[0] AS uid, types[0] AS type ORDER BY uid
        """
    )
    assert rows, "no renderable entry in the dataset to copy into worker sites"
    uids = [r[0] for r in rows]

    # Facility names the .feature files name outright. A clone keeps the source
    # facility's name, so copying an entry located at one of these is what makes
    # `I open the facility page for "Pharmacie des Félibres"` resolve on a worker
    # site. They are pulled to the front rather than appended so they survive the
    # `[:limit]` below.
    named, _ = db.cypher_query(
        """
        UNWIND $names AS wanted
        MATCH (entry:Entry {active: true})-[:HAS_FACILITY]->(f:Facility {name: wanted})
        MATCH (f)-[]->(:Commune)
              -[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(:DepartmentOfFrance)
              -[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY*]->(:Country)
        MATCH (entry)-[:HAS_EFFECTOR]->(:Effector)
        MATCH (entry)-[:HAS_EFFECTOR_TYPE]->(:EffectorType)
        WHERE f.location IS NOT NULL AND coalesce(entry.e2eWorkerSite, false) = false
        RETURN DISTINCT wanted, collect(entry.uid)[0] AS uid
        """,
        {"names": FEATURE_FACILITY_NAMES},
    )
    for wanted, uid in named:
        assert uid, f"no renderable entry at facility {wanted!r} to copy"
        if uid in uids:
            uids.remove(uid)
        uids.insert(0, uid)
    missing = set(FEATURE_FACILITY_NAMES) - {n for n, _ in named}
    assert not missing, f"facilities named in .feature files are absent: {missing}"

    while len(uids) < limit:
        uids.extend(r[0] for r in rows)
    chosen = uids[:limit]

    # Each of these brings its own cloned facility, so the count of distinct
    # source facilities is what the carousel scenarios actually depend on.
    assert len(set(chosen)) >= MIN_FACILITIES, (
        f"only {len(set(chosen))} distinct entries to copy, need at least "
        f"{MIN_FACILITIES}: the facility carousel needs a first, a middle and a "
        f"last slide to exercise all three button states"
    )
    return chosen


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
    """A Commune with the chain the entries query walks, and a point to sit on.

    Returns ``(commune_uid, location)``. The point is borrowed from a facility
    already in that commune rather than invented: it has to be a real Neo4j
    ``POINT``, and one inside the commune keeps the map showing the right part
    of France instead of the Gulf of Guinea.
    """
    rows, _ = db.cypher_query(
        """
        MATCH (c:Commune)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->
              (:DepartmentOfFrance)
        MATCH (f:Facility)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(c)
        WHERE f.location IS NOT NULL
        RETURN c.uid, f.location LIMIT 1
        """
    )
    assert rows, "no Commune with a department chain and a located facility"
    return rows[0][0], rows[0][1]


# Cypher's randomUUID() returns a *hyphenated* UUID, but every uid in the real
# dataset is hyphen-free (Python's uuid4().hex): 585 Entries against 30, and the
# 30 were these worker nodes. The mismatch is invisible until something joins
# the two stores — Organization.neomodel_uid is stored hyphen-free in Postgres
# and the serializer looks the Entry up by that exact string, so a hyphenated
# node is simply never found. That surfaced as a 500 on /api/v2/organization
# with four Pydantic errors (company_name, contact, legal_entity, department),
# none of which named the uid.
NEW_UID = "replace(randomUUID(), '-', '')"

def organization_type_uid():
    """The EffectorType the template site's own organization Entry carries.

    Read from the template rather than picked arbitrarily: an organization is
    typed as what it is ("maison de santé pluriprofessionnelle"), and the worker
    sites copy the template's msp category, so its organization has to be typed
    the same way or the data-driven home page takes a different branch.
    """
    rows, _ = db.cypher_query(
        """
        MATCH (e:Entry {uid: $uid})-[:HAS_EFFECTOR_TYPE]->(t:EffectorType)
        RETURN t.uid LIMIT 1
        """,
        {"uid": str(template_org.neomodel_uid).replace("-", "")},
    )
    assert rows, "the template site's organization Entry has no EffectorType"
    return rows[0][0]


ORG_TYPE_UID = organization_type_uid()
COMMUNE_UID, COMMUNE_LOCATION = commune_with_geography()
SOURCE_ENTRIES = source_entry_uids()
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
          ON CREATE SET o.uid = """ + NEW_UID + """, o.active = true
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

    # The Directory's one-to-one configuration rows, copied from the template so
    # a worker site renders the same controls and layout as the site it models.
    #
    # Neither is optional. The frontend reads them without guarding the nested
    # object — `directory?.inputField.situation` in +layout.server.ts, and
    # `page.data.directory.setting.path` in Organization/Occupations.svelte —
    # so a Directory missing either makes every page 500 during SSR with
    # "Cannot read properties of null". The error names only the leaf property,
    # which points nowhere near the missing row.
    for model in (InputField, Setting):
        template_row = model.objects.filter(directory=template_dir).first()
        if template_row:
            model.objects.get_or_create(
                directory=directory,
                defaults={
                    f.name: getattr(template_row, f.name)
                    for f in model._meta.fields
                    if f.name not in ("id", "directory")
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
            # Required by api.types.organization: a non-null string, or the
            # endpoint fails validation rather than returning a partial answer.
            "company_name": f"E2E WORKER {i}",
        },
    )
    # get_or_create leaves an existing row untouched, but the Entry uid must
    # always agree with the graph or every role lookup resolves to anonymous.
    if str(organization.neomodel_uid).replace("-", "") != org_entry_uid.replace("-", ""):
        organization.neomodel_uid = org_entry_uid
        organization.save(update_fields=["neomodel_uid"])
    if not organization.company_name:
        organization.company_name = f"E2E WORKER {i}"
        organization.save(update_fields=["company_name"])
    # The display names, which are *not* the Contact's field of the same name:
    # the home page titles itself
    # `capitalizeFirstLetter(organization.formatted_name)` and the hero greets
    # the visitor with formatted_name_definite_article, both read straight off
    # this row. Left empty they render a literally empty <title> and a hero
    # missing its subject, on a page that is otherwise a healthy 200.
    #
    # Repaired here rather than in the defaults above, which only apply when the
    # row is created: the worker sites already exist, so a site seeded by an
    # earlier version of this script would keep its empty names however often
    # this is re-run. The article is lower-case and French because it is
    # rendered mid-sentence ("la maison de santé de Gadagne").
    display_names = {
        "formatted_name": f"E2E worker {i}",
        "formatted_name_short": f"E2E w{i}",
        "formatted_name_definite_article": f"l'établissement E2E worker {i}",
    }
    stale = [f for f, v in display_names.items() if not getattr(organization, f)]
    if stale:
        for field in stale:
            setattr(organization, field, display_names[field])
        organization.save(update_fields=stale)

    # The organization's Contact — the Django half of the org, keyed on the same
    # entry uid as the graph node. OrganizationSerializer reads the address,
    # phone numbers and websites through it, and the Pydantic type requires it,
    # so an Organization without one 500s the endpoint outright.
    org_contact, _ = Contact.objects.get_or_create(
        neomodel_uid=org_entry_uid,
        defaults={"formatted_name": f"E2E worker {i}", "url": ""},
    )
    if organization.contact_id != org_contact.id:
        organization.contact = org_contact
        organization.save(update_fields=["contact"])

    # The legal entity behind the organization. Required by the Pydantic type
    # (the endpoint 500s without one), and the registration numbers are left
    # null on purpose: SIREN/SIRET identify a real French organisation, which a
    # throwaway test site must not claim.
    # SIREN and SIRET are unique and *not* nullable, so they default to the
    # empty string and the second worker collides with the first. They are given
    # distinct synthetic values per worker, taken from the 000-prefixed range
    # that INSEE never allocates — a real number would name a real company.
    LegalEntity.objects.get_or_create(
        organization=organization,
        defaults={
            "name": f"E2E WORKER {i}",
            "type": LegalEntity.Type.ASSO,
            "SIREN": f"00000000{i}",
            "SIRET": f"00000000{i}00000",
        },
    )

    # The Directory exists twice over: a Django row (created above, which is
    # what links it to the Site) and a Neo4j node of the same name, which is
    # what the entries query traverses. Creating only the Django row leaves
    # every `MATCH (d:Directory {name: …})` matching nothing, so the entries
    # below are created but attached to nothing and the API returns an empty
    # list — with no error anywhere.
    db.cypher_query(
        """
        MERGE (d:Directory {name: $dir})
          ON CREATE SET d.uid = """ + NEW_UID + """
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
          ON CREATE SET f.uid = """ + NEW_UID + """
        SET f.name = $facility_name, f.label = $facility_name, f.e2eWorkerSite = true,
            // A real point, copied from an existing facility in the same
            // commune. Not decorative: addressbook's get_address reads
            // facility.location.latitude unguarded, so a facility without one
            // raises AttributeError inside the serializer and /api/v2/organization
            // 500s — the map simply not rendering would be the least of it.
            f.location = $location
        MERGE (f)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(commune)

        WITH f
        MATCH (d:Directory {name: $dir})
        MATCH (org:Entry {uid: $org_entry})
        MERGE (d)-[:HAS_ENTRY]->(org)

        // The organization Entry is a real Entry and needs the same shape as
        // any other: OrganizationSerializer._fetch_commune_and_department walks
        // (org)-[:HAS_FACILITY]->(:Facility)-[…]->(:Commune) to resolve the
        // organization's commune and department, so a bare node makes
        // /api/v2/organization fail Pydantic validation on four fields at once
        // (company_name, contact, legal_entity, department) with nothing in the
        // message pointing at the missing relationship.
        //
        // Placed here, while there is still exactly one row: the UNWIND below
        // fans out to one row per entry spec, and a MERGE after that point runs
        // once per row — which is how an Entry ends up with several Effectors,
        // the violation tests/test_entry_graph_model.py exists to catch.
        MERGE (org)-[:HAS_FACILITY]->(f)
        WITH f, d, org
        MATCH (orgType:EffectorType {uid: $org_type})
        MERGE (org)-[:HAS_EFFECTOR_TYPE]->(orgType)
        MERGE (orgEf:Effector {slug_fr: $org_effector_slug})
          ON CREATE SET orgEf.uid = """ + NEW_UID + """
        SET orgEf.name_fr = $org_name, orgEf.label_fr = $org_name,
            orgEf.e2eWorkerSite = true
        MERGE (org)-[:HAS_EFFECTOR]->(orgEf)

        // Each worker entry is a *copy of a real one* — its name, occupation and
        // address are the dataset's, not invented. Invented rows are uniform in
        // ways real ones are not (same length, same flexion, same made-up
        // occupation), so a test can pass against them while real data breaks.
        //
        // Property-level copy via apoc.map.removeKeys rather than SET e = src:
        // assigning properties(src) would carry the source's uid and trip
        // constraint_unique_Entry_uid before a later SET could replace it. The
        // slug goes too, since the API looks entries up by slug and a duplicate
        // would make /fullentries/slug ambiguous between the copy and the
        // original.
        WITH f, d, org
        UNWIND $sources AS spec
        MATCH (src:Entry {uid: spec.uid})
        MERGE (e:Entry {slug: spec.slug})
          ON CREATE SET e = apoc.map.removeKeys(properties(src), ['uid', 'slug']),
                        e.uid = """ + NEW_UID + """,
                        e.slug = spec.slug
        SET e.active = true, e.e2eWorkerSite = true

        // Delete the type edge before re-creating it. MERGE would *add* a
        // second one when this script is re-run against a different source, and
        // the entries serializer emits one row per effector type — so an entry
        // with two types appears twice in /api/v2/entries and the team carousel
        // dies on Svelte's each_key_duplicate (it keys slides on uid). Same
        // reason the clone in seed.ts had to avoid a fan-out.
        WITH f, d, org, e, src, spec
        OPTIONAL MATCH (e)-[old:HAS_EFFECTOR_TYPE]->()
        DELETE old

        // The Effector is 1:1 with the Entry and carries the person's name, so
        // it is copied rather than shared: sharing it would rename the original
        // person every time this runs. rpps is dropped with the uid — it is a
        // real practitioner's registration number, which a test copy must not
        // claim even though nothing in the graph constrains it.
        WITH f, d, org, e, src, spec
        MATCH (src)-[:HAS_EFFECTOR]->(srcEf:Effector)
        MATCH (src)-[:HAS_EFFECTOR_TYPE]->(t:EffectorType)
        MERGE (ef:Effector {slug_fr: spec.slug + '-effector'})
          ON CREATE SET ef = apoc.map.removeKeys(properties(srcEf), ['uid', 'slug_fr', 'rpps']),
                        ef.uid = """ + NEW_UID + """,
                        ef.slug_fr = spec.slug + '-effector'
        SET ef.e2eWorkerSite = true
        MERGE (e)-[:HAS_EFFECTOR]->(ef)

        // Same EffectorType node as the source: types are reference data with a
        // uniqueness constraint on every name/label/slug field, so a copy could
        // not coexist with the original anyway.
        MERGE (e)-[:HAS_EFFECTOR_TYPE]->(t)

        // A *copy of the source's own facility*, so the worker site has several
        // distinctly named real places ("Pharmacie des Félibres", …) rather than
        // one invented one. Scenarios name facilities and assert that two never
        // share an address, which a single generic facility cannot satisfy.
        //
        // Copied, not shared: scenarios rename it, picture it and delete it, so
        // pointing at the original would mutate the real dataset. The commune
        // underneath is shared — it is reference data, and the geography chain
        // to Country is what makes the entry renderable at all.
        WITH f, d, org, e, src, spec
        MATCH (src)-[:HAS_FACILITY]->(srcF:Facility)
        MATCH (srcF)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(srcCommune:Commune)
        MERGE (ef2:Facility {slug: spec.slug + '-facility'})
          ON CREATE SET ef2 = apoc.map.removeKeys(properties(srcF), ['uid', 'slug']),
                        ef2.uid = """ + NEW_UID + """,
                        ef2.slug = spec.slug + '-facility'
        SET ef2.e2eWorkerSite = true
        MERGE (ef2)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(srcCommune)
        MERGE (e)-[:HAS_FACILITY]->(ef2)
        MERGE (d)-[:HAS_ENTRY]->(e)
        MERGE (e)-[:MEMBER_OF]->(org)
        """,
        {
            "commune": COMMUNE_UID,
            "location": COMMUNE_LOCATION,
            "facility_slug": f"{dir_name}-facility",
            "facility_name": f"E2E worker {i} facility",
            "dir": dir_name,
            "org_entry": org_entry_uid,
            "org_type": ORG_TYPE_UID,
            "org_effector_slug": f"{dir_name}-organization-effector",
            "org_name": f"E2E worker {i}",
            "sources": [
                {"slug": f"{dir_name}-entry-{n}", "uid": uid}
                for n, uid in enumerate(SOURCE_ENTRIES)
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
    # Every facility of this worker site, not just the generic one: the entries
    # now bring their own cloned facilities, and the picture scenarios open
    # whichever facility their entry sits at.
    #
    # Deliberately not all of them — `A facility without a photograph shows none`
    # needs one with no picture, so the last is left bare.
    places_set = 0
    if PLACE_IMAGES:
        rows, _ = db.cypher_query(
            """
            MATCH (f:Facility)
            WHERE f.e2eWorkerSite = true AND f.slug STARTS WITH $prefix
            RETURN f.uid ORDER BY f.slug
            """,
            {"prefix": dir_name},
        )
        # The generic facility (e2e-wN-facility, the one the organization Entry
        # sits at) is deliberately left without a picture: `A facility without a
        # photograph shows none` needs one, and every other facility here is a
        # clone that carries one. Cleared rather than skipped, so a site seeded
        # by an older version of this script converges too.
        generic, _ = db.cypher_query(
            "MATCH (f:Facility {slug: $slug}) RETURN f.uid",
            {"slug": f"{dir_name}-facility"},
        )
        generic_uids = {row[0] for row in generic}
        PlaceImage.objects.filter(neomodel_uid__in=generic_uids).delete()

        for n, (facility_uid,) in enumerate(rows):
            if facility_uid in generic_uids:
                continue
            place, _ = PlaceImage.objects.get_or_create(neomodel_uid=facility_uid)
            if not place.image:
                place.image = f"place_images/{PLACE_IMAGES[n % len(PLACE_IMAGES)]}"
                place.save()
            places_set += 1

    print(
        f"seeded {domain:<24} dir={dir_name:<8} entries={len(entry_uids)} "
        f"avatars={avatars_set} places={places_set} "
        f"{'(new site)' if site_created else '(existing)'}"
    )

    # The per-role test users, scoped to *this* site's organization Entry.
    #
    # Run here rather than as a separate step, because it has to happen after
    # the organization Entry above and again whenever that Entry is recreated:
    # roles are granted as (User)-[:HAS_ACCESS]->(Access)-[:ACCESS_TO]->(Entry),
    # so re-running this seeder alone left every worker's users pointing at a
    # deleted Entry. Nothing failed loudly — the users still existed, the site
    # still rendered, and only the edit affordances silently disappeared,
    # failing every scenario that signs in.
    # Kept identical to seed_test_users.py rather than paraphrased: the Account
    # sub values are what tests/fixtures/session.ts mints its cookies against,
    # and ac.active is what makes the role count.
    for email, sub, role in TEST_USERS:
        db.cypher_query(
            """
            MERGE (u:User {email: $email})
              ON CREATE SET u.uid = """ + NEW_UID + """, u.name = $email
            MERGE (a:Account {sub: $sub})
              ON CREATE SET a.uid = """ + NEW_UID + """
            MERGE (u)-[:HAS_ACCOUNT]->(a)
            WITH u
            MATCH (e:Entry {uid: $entry_uid})
            MERGE (u)-[:HAS_ACCESS]->(ac:Access {role: $role})-[:ACCESS_TO]->(e)
              ON CREATE SET ac.uid = """ + NEW_UID + """
            SET ac.active = true, ac.e2eWorkerSite = true
            """,
            {"email": email, "sub": sub, "role": role, "entry_uid": org_entry_uid},
        )

print(f"WORKER_SITES_SEEDED {WORKERS}")
