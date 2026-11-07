import { djangoShell, clearApiCache, SEED_TAG } from '../steps/seed';

/**
 * Clears anything a previous run left behind, before the suite starts.
 *
 * Scenario teardown runs in After hooks, which do not fire when a run is
 * interrupted — a timeout, Ctrl-C, a crashed worker. What survives is not
 * inert: an ownership link left on the staff test user makes the scenarios
 * about a staff member *unconnected* to a facility exercise one who is
 * connected, so they pass while proving the opposite of their name. That is
 * worse than a failure, because nothing reports it.
 *
 * Everything removed here is test-owned: the seeded users' ownership links,
 * nodes carrying the seed tag, and facilities created under an e2e slug. Real
 * data is never touched.
 */
async function globalSetup() {
	const out = await djangoShell(`
from neomodel import db
from facility.models import PlaceImage

# Ownership granted to the test users by earlier scenarios.
links, _ = db.cypher_query("""
MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account)
WHERE a.sub STARTS WITH 'e2e-sub-'
MATCH ()-[r:OWNED_BY|CREATED_BY]->(u)
DELETE r
RETURN count(r)
""")

# Nodes the seeding helpers tag as their own. The tag is per worker
# (e2eSeed0, e2eSeed1, ...) and this runs outside any worker, where SEED_TAG is
# the bare prefix: matched as a prefix, or nothing a worker left is found.
TAGGED = "MATCH (n) WHERE any(k IN keys(n) WHERE k STARTS WITH '${SEED_TAG}' AND n[k] = true)"

# What the mail side recorded for seeded invitations: a bounce left behind is
# counted in the next run's "adresses à vérifier" banner.
from mailer.models import EmailDelivery, EmailSuppression
invitees, _ = db.cypher_query(TAGGED + " AND n:Invitee RETURN n.uid, n.email")
EmailDelivery.objects.filter(invitee_uid__in=[uid for uid, _ in invitees]).delete()
EmailSuppression.objects.filter(address__in=[email for _, email in invitees if email]).delete()

tagged, _ = db.cypher_query(TAGGED + " DETACH DELETE n RETURN count(n)")

# The people steps/entry-creation-flow.steps.ts creates, and their entries:
# untagged, removed by its After hook, which an interrupted run skips. A
# leftover entry sorts among a worker site's own and shifted its pictures.
from addressbook.models import Contact
created, _ = db.cypher_query("""
MATCH (p:Effector) WHERE p.name_fr STARTS WITH 'E2e Création '
OPTIONAL MATCH (p)<-[:HAS_EFFECTOR]-(e:Entry)
RETURN collect(DISTINCT e.uid), count(DISTINCT p)
""")
Contact.objects.filter(neomodel_uid__in=created[0][0]).delete()
db.cypher_query("""
MATCH (p:Effector) WHERE p.name_fr STARTS WITH 'E2e Création '
OPTIONAL MATCH (p)<-[:HAS_EFFECTOR]-(e:Entry)
DETACH DELETE e, p
""")
tagged[0][0] += created[0][1]

# Facilities created by the scenarios that make one from scratch.
#
# The worker sites' own facilities are excluded: they are named e2e-wN-facility
# and so match the same prefix, but they are *fixtures*, seeded once by
# seed_worker_sites.py and expected to outlive the run. Deleting them detached
# every entry from its facility, which drops the whole site out of
# /api/v2/entries (the query walks Entry->Facility->Commune->Department->
# Country) — the API answered 200 with an empty list and every scenario failed
# on "this site has no active entry", pointing nowhere near here.
facilities, _ = db.cypher_query("""
MATCH (f:Facility)
WHERE (f.slug STARTS WITH 'e2e-' OR f.name STARTS WITH 'e2e ')
  AND coalesce(f.e2eWorkerSite, false) = false
DETACH DELETE f
RETURN count(f)
""")

# Pictures seeded onto real facilities, recognisable by their file name.
pictures = 0
for place in PlaceImage.objects.all():
    if place.image and "${SEED_TAG}" in place.image.name:
        place.image.delete(save=False)
        place.delete()
        pictures += 1

print("CLEANED", links[0][0], tagged[0][0], facilities[0][0], pictures)
`);

	const match = out.match(/CLEANED (\d+) (\d+) (\d+) (\d+)/);
	if (match) {
		const [, links, tagged, facilities, pictures] = match;
		if (Number(links) || Number(tagged) || Number(facilities) || Number(pictures)) {
			console.log(
				`[globalSetup] cleared leftovers — ownership links: ${links}, tagged nodes: ${tagged}, ` +
					`facilities: ${facilities}, pictures: ${pictures}`
			);
		}
	} else {
		console.warn(`[globalSetup] cleanup did not report a result:\n${out}`);
	}

	await clearApiCache();
}

export default globalSetup;
