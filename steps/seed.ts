import { execFile } from 'node:child_process';

const BACKEND_DIR = new URL('../../backend', import.meta.url).pathname;
const COMPOSE_FILE = 'docker-compose-development.yml';

/**
 * Everything a scenario seeds is tagged with this label, so teardown can find
 * and remove it without knowing what was created. Nothing in the real dataset
 * carries it, which makes cleanup safe even after a failure mid-scenario.
 */
export const SEED_TAG = 'e2eSeed';

/** Runs Python in the backend's Django shell and returns stdout. */
export function djangoShell(code: string): Promise<string> {
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
	await clearApiCache();
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
	await clearApiCache();
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
	await clearApiCache();
}

/**
 * Removes everything tagged by this module. Safe to call unconditionally: it
 * matches only nodes carrying the seed tag, never real data.
 */
export async function removeSeededData(): Promise<void> {
	await djangoShell(`
from neomodel import db
db.cypher_query("MATCH (n) WHERE n.${SEED_TAG} = true DETACH DELETE n")
print("CLEANED")
`);
	await clearApiCache();
}
