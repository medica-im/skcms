import { execFile } from 'node:child_process';

const BACKEND_DIR = new URL('../../backend', import.meta.url).pathname;
const COMPOSE_FILE = 'docker-compose-development.yml';

/**
 * Everything a scenario seeds is tagged with this label, so teardown can find
 * and remove it without knowing what was created. Nothing in the real dataset
 * carries it, which makes cleanup safe even after a failure mid-scenario.
 *
 * Suffixed with the Playwright worker index: removeSeededData() below deletes
 * every node carrying the tag, and workers run scenarios concurrently, so a
 * tag shared across workers let one worker's teardown delete data a sibling
 * worker's still-running scenario depended on. TEST_PARALLEL_INDEX is set by
 * Playwright in each worker process — see workerMain.js in the playwright
 * package — and is stable for the process's lifetime.
 */
export const SEED_TAG = `e2eSeed${process.env.TEST_PARALLEL_INDEX ?? ''}`;

/** Runs Python in the backend's Django shell and returns stdout, nothing else. */
function runDjangoShell(code: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = execFile(
			'docker',
			['compose', '-f', COMPOSE_FILE, 'exec', '-T', 'django', 'python', 'manage.py', 'shell'],
			{ cwd: BACKEND_DIR, timeout: 120_000 },
			(error, stdout, stderr) => {
				if (error) return reject(new Error(`django shell failed: ${stderr || error.message}`));
				resolve(stdout);
			}
		);
		child.stdin?.end(code);
	});
}

/**
 * Runs Python in the backend's Django shell, then drops the cached API
 * payloads.
 *
 * **The cache is cleared here, once, rather than by each caller.** The backend
 * invalidates its own cache on every write that goes through the API (some 29
 * `clear_cache` calls), and that path is worth exercising — so the cache stays
 * enabled during tests rather than being switched off, and a real invalidation
 * regression would still be caught.
 *
 * What the backend cannot invalidate is a write that never reaches it: test
 * setup reaching straight into Neo4j or the Django ORM, as everything here
 * does. Every such write must therefore drop the cache itself, and every one of
 * them did — by hand, on the line after. Forgetting that line does not fail
 * loudly; it serves one stale payload, so a scenario asserting "hidden" sees
 * the previous value and the run looks flaky. That is exactly the bug that cost
 * an afternoon in `the avatar access level is …`. Making it the default removes
 * the whole class.
 *
 * Pass `{ readOnly: true }` for a query that only reads, to skip the ~1s the
 * clearing costs.
 */
export async function djangoShell(
	code: string,
	options: { readOnly?: boolean } = {}
): Promise<string> {
	const out = await runDjangoShell(code);
	if (!options.readOnly) await clearApiCache();
	return out;
}

/**
 * Drops cached API payloads so freshly seeded data is visible immediately.
 *
 * Matches `*v2:*` rather than `v2:*`: Django's cache backend prefixes every
 * key with its version (":1:v2:entries:…"), so an anchored pattern silently
 * matches nothing and the scenario reads a stale list.
 */
export function clearApiCache(): Promise<void> {
	return new Promise((resolve) => {
		execFile(
			'docker',
			[
				'compose',
				'-f',
				COMPOSE_FILE,
				'exec',
				'-T',
				'redis',
				'sh',
				'-c',
				"redis-cli --scan --pattern '*v2:*' | xargs -r redis-cli DEL"
			],
			{ cwd: BACKEND_DIR, timeout: 30_000 },
			() => resolve()
		);
	});
}

/** A cloned entry and the handful of ids a scenario needs to drive it. */
export type ClonedEntry = {
	/** Neo4j Entry.uid — what the API calls the entry's uid. */
	uid: string;
	/** Entry.slug — what /fullentries/slug/{slug} and /e/{slug} take. */
	slug: string;
	/** The name rendered in listings and carousels, unique to this clone. */
	name: string;
	/** The entry this was copied from, for tests that need to compare. */
	sourceUid: string;
};

/**
 * Copies an existing entry into a throwaway one of its own.
 *
 * This is the answer to a whole family of flaky failures. Scenarios used to
 * *borrow* a real entry — "the first one with an avatar", "the first facility
 * with a slug" — and then mutate it. Two features doing that on two workers
 * land on the same row, and one resets what the other is asserting: it cost us
 * a spurious "@mode:serial", a permanently-public avatar, and several hours of
 * bisecting. A scenario that owns its data cannot be interfered with, so
 * nothing has to be serialised and no worker-scoped bookkeeping is needed.
 *
 * What is copied and what is shared is the crux:
 *
 * * **Copied** — the `Entry`, its 1:1 `Effector` (which carries the person's
 *   name, slug and rpps), and the Django `Contact` row keyed on the entry uid
 *   (which carries `profile_image` and `avatar_access`). These are the
 *   identity-bearing, mutable parts, and every one of them gets a fresh uid,
 *   a fresh slug and a suffixed name so nothing collides — `Entry.uid` and
 *   `Effector.uid` are the only uniqueness constraints in the graph, but the
 *   API looks entries up *by slug*, so a duplicate slug would make
 *   /fullentries/slug ambiguous.
 * * **Shared** — `EffectorType`, `Facility`, `Commune`, `Directory` and
 *   `Organization`. Copying those would change what the page renders (and
 *   EffectorType has a uniqueness constraint on every name/label/slug field,
 *   so a copy could not exist alongside the original anyway). The clone points
 *   at the very same reference nodes, which is what makes it behave like the
 *   entry it came from.
 *
 * `Appointment` is deliberately not copied: no scenario reads it, and copying
 * it would mean reproducing its own graph.
 *
 * Tagged with SEED_TAG so a crashed run is still cleaned up by globalSetup.
 * Call removeClonedEntry() from an After hook for the normal path.
 */
export async function cloneEntry(options: {
	/** Entry.uid to copy. */
	sourceUid: string;
	/** Distinguishes this clone in names and slugs; defaults to a random one. */
	discriminator?: string;
}): Promise<ClonedEntry> {
	const { sourceUid } = options;
	// Random rather than a counter: scenarios run in several processes, so a
	// per-process counter would repeat across workers.
	const discriminator =
		options.discriminator ?? `${SEED_TAG}-${Math.random().toString(36).slice(2, 8)}`;

	const out = await djangoShell(`
from neomodel import db
from addressbook.models import Contact

# The copy keeps every relationship that decides where the entry appears
# (directory, organization, facility, type) and none of the identity.
rows, _ = db.cypher_query("""
MATCH (src:Entry {uid: $source})
OPTIONAL MATCH (src)-[:HAS_EFFECTOR]->(srcEf:Effector)

// The uid and slug are removed from the copied map rather than overwritten
// afterwards: assigning properties(src) puts the source's uid on the new node,
// which trips constraint_unique_Entry_uid before a later SET can replace it.
WITH src, srcEf,
     apoc.map.removeKeys(properties(src), ['uid', 'slug']) AS srcProps
CREATE (e:Entry)
SET e = srcProps
SET e.uid = randomUUID(),
    e.slug = src.slug + '-' + $disc,
    e.${SEED_TAG} = true

// The Effector is 1:1 with the Entry and holds the person's name, so it is
// copied rather than shared — sharing it would rename the original too.
//
// Created here, while there is still exactly one row: an entry can have
// several MEMBER_OF targets (its organization Entry *and* an Organization
// node), and matching those below multiplies the rows. A CREATE placed after
// that fan-out runs once per row, which gave the clone three Effectors, made
// the serializer emit the entry three times, and crashed the team carousel
// with Svelte's each_key_duplicate (it keys slides on uid).
//
// uid is dropped from the copied map for the same reason as the Entry above:
// assigning it would trip constraint_unique_Effector_uid. rpps goes too — it
// is a real professional's registration number, which a copy must not claim
// even though the graph does not constrain it.
FOREACH (_ IN CASE WHEN srcEf IS NULL THEN [] ELSE [1] END |
  CREATE (ef:Effector)
  SET ef = apoc.map.removeKeys(properties(srcEf), ['uid', 'rpps'])
  SET ef.uid = randomUUID(),
      ef.name_fr = srcEf.name_fr + ' ' + $disc,
      ef.label_fr = srcEf.label_fr + ' ' + $disc,
      ef.slug_fr = srcEf.slug_fr + '-' + $disc,
      ef.${SEED_TAG} = true
  MERGE (e)-[:HAS_EFFECTOR]->(ef))

// Same type, same place, same directory, same memberships: the clone has to
// show up wherever the original does, so these point at the shared nodes.
//
// Each set is collected into a list before it is used, so every FOREACH runs
// once over a list rather than once per matched row — the fan-out that
// duplicated the Effector above.
WITH src, e
OPTIONAL MATCH (src)-[:HAS_EFFECTOR_TYPE]->(t:EffectorType)
WITH src, e, collect(DISTINCT t) AS types
FOREACH (t IN types | MERGE (e)-[:HAS_EFFECTOR_TYPE]->(t))

WITH src, e
OPTIONAL MATCH (src)-[:HAS_FACILITY]->(f:Facility)
WITH src, e, collect(DISTINCT f) AS facilities
FOREACH (f IN facilities | MERGE (e)-[:HAS_FACILITY]->(f))

WITH src, e
OPTIONAL MATCH (d:Directory)-[:HAS_ENTRY]->(src)
WITH src, e, collect(DISTINCT d) AS directories
FOREACH (d IN directories | MERGE (d)-[:HAS_ENTRY]->(e))

WITH src, e
OPTIONAL MATCH (src)-[:MEMBER_OF]->(m)
WITH e, collect(DISTINCT m) AS memberships
FOREACH (m IN memberships | MERGE (e)-[:MEMBER_OF]->(m))

WITH e
OPTIONAL MATCH (e)-[:HAS_EFFECTOR]->(ef:Effector)
RETURN e.uid, e.slug, coalesce(ef.name_fr, e.name)
""", {"source": ${JSON.stringify(sourceUid)}, "disc": ${JSON.stringify(discriminator)}})

assert rows, "source entry not found: ${sourceUid}"
uid, slug, name = rows[0]

# properties() copies properties but not labels, and an Effector carries
# sub-labels (HealthWorker, RPPS, …) that writes elsewhere set. No read query
# filters on them today, but a clone should look like what it was copied from.
# Labels cannot be parameterised in Cypher, hence the interpolation — the values
# come from the source node's own labels, not from the test.
labels, _ = db.cypher_query("""
MATCH (src:Entry {uid: $source})-[:HAS_EFFECTOR]->(srcEf:Effector)
RETURN [l IN labels(srcEf) WHERE l <> 'Effector']
""", {"source": "${sourceUid}"})
extra = labels[0][0] if labels else []
if extra:
    db.cypher_query(
        "MATCH (e:Entry {uid: $uid})-[:HAS_EFFECTOR]->(ef:Effector) SET ef:"
        + ":".join("\`" + l.replace("\`", "") + "\`" for l in extra),
        {"uid": uid},
    )

# The avatar lives on the Django side, keyed by the entry uid. Copied without
# the image file: a scenario that wants a picture seeds one with seedAvatar(),
# and copying the file would leave the clone sharing storage with the original.
src_contact = Contact.objects.filter(neomodel_uid="${sourceUid}").first()
if src_contact:
    Contact.objects.create(
        neomodel_uid=uid,
        avatar_access=src_contact.avatar_access,
    )

print("ENTRY_CLONED", uid, slug, name)
`);

	const match = out.match(/ENTRY_CLONED (\S+) (\S+) (.+)/);
	if (!match) throw new Error(`cloning entry failed: ${out}`);
	return { uid: match[1], slug: match[2], name: match[3].trim(), sourceUid };
}

/**
 * Removes a clone and everything created with it, leaving the original alone.
 *
 * Guarded on the seed tag as well as the uid, so passing a real entry's uid by
 * mistake deletes nothing.
 */
export async function removeClonedEntry(uid: string): Promise<void> {
	await djangoShell(`
from neomodel import db
from addressbook.models import Contact

Contact.objects.filter(neomodel_uid="${uid}").delete()

db.cypher_query("""
MATCH (e:Entry {uid: $uid}) WHERE e.${SEED_TAG} = true
OPTIONAL MATCH (e)-[:HAS_EFFECTOR]->(ef:Effector) WHERE ef.${SEED_TAG} = true
DETACH DELETE e, ef
""", {"uid": ${JSON.stringify(uid)}})
print("CLONE_REMOVED")
`);
}

/**
 * Creates an effector type and one entry of that type in the site's directory,
 * so the type shows up in the team section of the home page.
 *
 * The caller chooses name and label, which is the point: a scenario that needs
 * an acronym creates one rather than hoping the dataset happens to contain a
 * CPTS, an MSP, or whatever the client's organisation type happens to be.
 */
export async function seedEffectorType(options: {
	siteDomain: string;
	name: string;
	label: string;
	slug: string;
}): Promise<void> {
	const { siteDomain, name, label, slug } = options;
	const out = await djangoShell(`
from neomodel import db
from directory.models.core import Directory
from django.contrib.sites.models import Site

from facility.models import Organization

site = Site.objects.get(domain=${JSON.stringify(siteDomain)})
directory = Directory.objects.filter(site=site).first()
assert directory, "no directory for site"
org_uid = Organization.objects.get(site=site).neomodel_uid.hex

# The entries query requires a full facility chain
# (entry)-[:HAS_FACILITY]->(Facility)->(Commune)->(Department)->(Country),
# so the seeded entry reuses an existing facility of this directory rather
# than inventing that whole geography.
rows, _ = db.cypher_query("""
MATCH (d:Directory {name: $dir})-[:HAS_ENTRY]->(:Entry)-[:HAS_FACILITY]->(f:Facility)
MATCH (f)-->(:Commune)-[:LOCATED_IN_THE_ADMINISTRATIVE_TERRITORIAL_ENTITY]->(:DepartmentOfFrance)
RETURN f.uid LIMIT 1
""", {"dir": directory.name})
assert rows, "no usable facility in this directory to attach the seeded entry to"
facility_uid = rows[0][0]

db.cypher_query("""
MATCH (d:Directory {name: $dir})
MATCH (f:Facility {uid: $facility})
MERGE (t:EffectorType {slug_fr: $slug})
  ON CREATE SET t.uid = randomUUID()
SET t.name_fr = $name, t.label_fr = $label, t.${SEED_TAG} = true
MERGE (ef:Effector {name_fr: $effector})
  ON CREATE SET ef.uid = randomUUID(), ef.slug_fr = $slug + '-effector'
SET ef.${SEED_TAG} = true
MERGE (e:Entry {slug: $slug + '-entry'})
  ON CREATE SET e.uid = randomUUID()
SET e.active = true, e.${SEED_TAG} = true
MERGE (e)-[:HAS_EFFECTOR_TYPE]->(t)
MERGE (e)-[:HAS_EFFECTOR]->(ef)
MERGE (e)-[:HAS_FACILITY]->(f)
MERGE (d)-[:HAS_ENTRY]->(e)
WITH e
// The team section lists entries belonging to the site's own organization
// (Organization.neomodel_uid), so without this the seeded entry reaches the
// API but never the page.
MATCH (org) WHERE org.uid = $org_uid
MERGE (e)-[:MEMBER_OF]->(org)
""", {"dir": directory.name, "org_uid": org_uid, "slug": ${JSON.stringify(slug)},
      "name": ${JSON.stringify(name)}, "label": ${JSON.stringify(label)},
      "effector": ${JSON.stringify(`${name} test`)},
      "facility": facility_uid})
print("SEEDED", ${JSON.stringify(slug)})
`);
	if (!out.includes('SEEDED')) throw new Error(`seeding failed: ${out}`);
}

/**
 * Gives an entry a profile picture at a chosen access level.
 *
 * The image is a plain grey square generated in-process — these scenarios care
 * about who may see a picture, never about what it depicts. Seeding one means
 * the avatar scenarios no longer depend on a dataset happening to contain an
 * entry with a photo at the right access level.
 *
 * Returns the entry slug, so the caller can navigate to it.
 */
export async function seedAvatar(options: {
	entryUid: string;
	access: 'anonymous' | 'staff' | 'administrator';
}): Promise<void> {
	const { entryUid, access } = options;
	const out = await djangoShell(`
import io
from PIL import Image
from django.core.files.base import ContentFile
from addressbook.models import Contact

buffer = io.BytesIO()
Image.new("RGB", (256, 256), (200, 200, 200)).save(buffer, format="PNG")

c = Contact.objects.get(neomodel_uid="${entryUid}")
c.profile_image.save("${SEED_TAG}-${entryUid}.png", ContentFile(buffer.getvalue()), save=False)
c.avatar_access = "${access}"
c.save()
print("AVATAR_SET", c.avatar_access, bool(c.profile_image))
`);
	if (!out.includes('AVATAR_SET')) throw new Error(`seeding avatar failed: ${out}`);
}

/**
 * Takes away a picture this module added, leaving the entry as it was found.
 *
 * Only removes files named with the seed tag, so an entry that already had a
 * real photo is never stripped of it.
 */
export async function removeSeededAvatar(entryUid: string): Promise<void> {
	await djangoShell(`
from addressbook.models import Contact
c = Contact.objects.get(neomodel_uid="${entryUid}")
if c.profile_image and "${SEED_TAG}" in c.profile_image.name:
    c.profile_image.delete(save=False)
    c.avatar_access = "anonymous"
    c.save()
    print("AVATAR_REMOVED")
else:
    print("AVATAR_KEPT (not seeded by the tests)")
`);
}

/**
 * Removes everything tagged by this module. Only for whole-run cleanup
 * (tests/globalSetup.ts), never from a scenario's After hook.
 *
 * The tag is per *worker*, not per scenario, so from an After hook this also
 * deletes what sibling scenarios on the same worker are still using: the
 * occupation-labels scenarios each seed an effector type, and the first one to
 * finish used to delete the second one's type out from under it, so the button
 * it was waiting for never appeared. Use removeSeededEffectorType() from a
 * scenario instead.
 */
export async function removeSeededData(): Promise<void> {
	await djangoShell(`
from neomodel import db
db.cypher_query("MATCH (n) WHERE n.${SEED_TAG} = true DETACH DELETE n")
print("CLEANED")
`);
}

/**
 * Removes one seeded effector type and the entry and effector created with it,
 * leaving anything a sibling scenario seeded alone.
 *
 * Matches on the slug the caller chose *and* on the seed tag, so a typo in a
 * slug can never reach real data.
 */
export async function removeSeededEffectorType(slug: string): Promise<void> {
	await djangoShell(`
from neomodel import db
db.cypher_query("""
MATCH (t:EffectorType {slug_fr: $slug}) WHERE t.${SEED_TAG} = true
OPTIONAL MATCH (e:Entry {slug: $slug + '-entry'}) WHERE e.${SEED_TAG} = true
OPTIONAL MATCH (ef:Effector {slug_fr: $slug + '-effector'}) WHERE ef.${SEED_TAG} = true
DETACH DELETE t, e, ef
""", {"slug": ${JSON.stringify(slug)}})
print("CLEANED", ${JSON.stringify(slug)})
`);
}

/**
 * Gives an entry a phone number, so the edit and delete controls render.
 *
 * The e2e dataset has no contact rows at all — every entry comes back with
 * `phones: null` — so a scenario about the phone dialogs has to create one
 * rather than go looking for it. The roles decide who sees the number
 * (api/utils.py scrub() filters on them); all five are attached so the row is
 * visible whichever role the scenario browses as.
 */
export async function seedPhone(options: {
	entryUid: string;
	phone?: string;
	type?: string;
}): Promise<void> {
	const { entryUid, phone = '0102030405', type = 'W' } = options;
	const out = await djangoShell(`
from addressbook.models import Contact, PhoneNumber
from access.models import Role

c = Contact.objects.get(neomodel_uid="${entryUid}")
p, _ = PhoneNumber.objects.get_or_create(
    contact=c, phone="${phone}", type="${type}",
    defaults={"public_visible": True, "contact_visible": True},
)
p.roles.set(Role.objects.all())
p.save()
print("PHONE_SET", p.pk, p.phone, p.roles.count())
`);
	if (!out.includes('PHONE_SET')) throw new Error(`seeding phone failed: ${out}`);
}
