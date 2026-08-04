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

# Nodes the seeding helpers tag as their own.
tagged, _ = db.cypher_query("""
MATCH (n) WHERE n.${SEED_TAG} = true
DETACH DELETE n
RETURN count(n)
""")

# Facilities created by the scenarios that make one from scratch.
facilities, _ = db.cypher_query("""
MATCH (f:Facility)
WHERE f.slug STARTS WITH 'e2e-' OR f.name STARTS WITH 'e2e '
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
