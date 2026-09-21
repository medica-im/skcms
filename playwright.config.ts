import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { apiOrigin } from './tests/fixtures/session';
import { SITE_CONTEXTS, specsBySite } from './tests/sites/sites';

/** Where the per-tenant specs live; see siteProjects() at the foot of this file. */
const SITES_DIR = './tests/sites';

// Generates Playwright specs from Gherkin .feature files + step definitions.
const testDir = defineBddConfig({
	features: 'features/**/*.feature',
	steps: 'steps/**/*.ts'
});

/**
 * Auth.js decides which session-cookie name/salt to use — both in SvelteKit's
 * own handler and independently in the backend's fastapi_nextauth_jwt — from
 * whether the request looks like https://. Browsing through localhost:3000
 * directly means Chromium only ever sees plain http, while the site is reached
 * over real TLS: the two disagree and no cookie can satisfy both. nginx
 * terminates TLS for the worker hostnames and forwards X-Forwarded-Proto (see
 * hooks.server.ts's trustForwardedProto), so routing the browser through nginx
 * makes the scheme agree end-to-end.
 *
 * **Per worker, not one origin for the run.** Each Playwright worker browses
 * its own wN.dev.medica.im, which the backend resolves to its own Site and
 * therefore its own dataset — see apiOrigin() in tests/fixtures/session.ts for
 * why sharing one was untenable.
 *
 * baseURL has to be a *fixture* rather than a plain value: this file is
 * evaluated once in the main process, where TEST_PARALLEL_INDEX does not exist
 * yet. Reading it here would give every worker w0. The fixture below is
 * evaluated inside each worker, where the index is set.
 */

// How many worker sites are served at their root. The rest carry a base path.
// Mirrors ROOT_WORKERS in scripts/e2e-workers.sh, which does the serving; the
// two are one setting expressed in two places and must agree.
/**
 * Machine-local settings, the same file scripts/test-all.sh reads.
 *
 * Read here too because a bare `playwright test` is the obvious command and
 * does not go through that script: without this, .env.test-all applied to
 * `test-all.sh bdd` and silently did nothing to `playwright test`, which is a
 * settings file that lies about being one. A real environment variable still
 * wins, so `PLAYWRIGHT_WORKERS=4 playwright test` overrides the file.
 */
function settingsFile(): Record<string, string> {
	try {
		const text = readFileSync(new URL('./.env.test-all', import.meta.url), 'utf8');
		return Object.fromEntries(
			text
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line && !line.startsWith('#'))
				.map((line) => line.replace(/^export\s+/, ''))
				.map((line) => {
					const eq = line.indexOf('=');
					return eq === -1
						? ['', '']
						: [line.slice(0, eq).trim(), line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')];
				})
				.filter(([key]) => key)
		);
	} catch {
		return {};
	}
}

const settings = settingsFile();
const setting = (name: string) => process.env[name] ?? settings[name];

const E2E_WORKERS = Number(setting('E2E_WORKERS') ?? 8);

/**
 * Features that measure or drag real layout boxes, and so need the machine to
 * themselves.
 *
 * cropperjs positions its selection from getBoundingClientRect and moves it by
 * pointer events; the backdrop and centering scenarios compare rendered
 * geometry. Under contention a renderer that loses the race reports a box that
 * is briefly wrong, or a drag that never lands, and the failure reads as a
 * product bug -- "the preview is not drawn as a circle", "the crop starts
 * inside a landscape photograph". Those same scenarios pass alone: 63 of 63 on
 * an idle box, having failed in a full parallel run minutes earlier.
 *
 * So they run in their own projects, `fullyParallel: false` and one worker,
 * after the parallel ones. It costs a few minutes of wall clock and removes a
 * class of failure that has twice been mistaken for a real defect.
 */
const PIXEL_SENSITIVE = [
	'avatar-crop-preview',
	'modal-backdrop',
	'modal-centering',
	'facility-modal-mobile'
];

const pixelMatch = new RegExp(`(${PIXEL_SENSITIVE.join('|')})\\.feature`);
const ROOT_WORKERS = Math.ceil(E2E_WORKERS / 2);

export default defineConfig({
	testDir,
	// After hooks do not run when a run is interrupted, and what they leave
	// behind can make later scenarios pass while proving the opposite of their
	// name (see tests/globalSetup.ts).
	globalSetup: './tests/globalSetup.ts',
	// list on the terminal as before, plus a JSON file so DURATIONS survive the
	// run. Without it every timing is printed and thrown away, and the only
	// signal a scenario has got slower is the timeout -- which reports a
	// failure, not a regression, and only once it is already 120s slow. A
	// scenario that should take 5s and takes 60s is a bug, and it passes today.
	// Three reporters, because they answer different questions:
	//
	//   list  — the terminal, live. What is running and what just failed.
	//   json  — durations, so slowness is measurable after the fact
	//           (./scripts/slow-scenarios.sh). Without it every timing is
	//           printed once and thrown away.
	//   html  — the failure DETAIL: error, stack, the page snapshot and the
	//           trace, browsable instead of copy-pasted out of a terminal.
	//           `open: 'never'` so a run does not hijack a browser; read it with
	//           `pnpm exec playwright show-report`.
	reporter: [
		['list'],
		['json', { outputFile: 'test-results/results.json' }],
		['html', { open: 'never', outputFolder: 'playwright-report' }]
	],
	// 60s, from the measured distribution rather than from headroom.
	//
	// Over 104 passing scenarios on 2026-09-15: p50 9s, p90 21s, p99 32s, max
	// 44s. The slow ones drive the backend through `manage.py shell` in Docker
	// at ~10s a call, which is why the 30s default was too tight -- but 120s was
	// 2.7x more than anything legitimate has ever needed, and that cost twice:
	//
	//   * a failing scenario burned 2 minutes before reporting, 4 with the
	//     retry, so a run spent most of its wall clock confirming failures that
	//     were obvious at second 20;
	//   * and it HID slowness. A scenario that should take 5s and takes 60s is a
	//     bug, and at 120s it passes silently. The first sign would be a timeout
	//     months later, reported as a failure rather than as the regression it
	//     is.
	//
	// 60s leaves ~36% over the slowest observed pass. Watch it with
	// ./scripts/slow-scenarios.sh, which reads the json reporter's durations;
	// if a legitimate scenario starts landing near it, fix the scenario before
	// raising this.
	timeout: 60_000,
	// Four browsers, four Vite servers and a Dockerised backend share one 15GB
	// box, and a renderer that loses that race dies mid-step: the failure reads
	// as "Target crashed", or as an assertion whose Received is `undefined`
	// rather than a count — the query never came back. That is not a fact about
	// the app, so it should not fail the run on its own.
	//
	// This is also what makes `trace: 'on-first-retry'` below produce anything:
	// with no retries there is never a first retry, so the suite has been
	// discarding the traces of exactly the failures that most need them.
	// RETRIES is overridable now that the box is not the reason for them.
	//
	// They were added when 4 browsers on a 15GB machine starved each other and a
	// dead renderer failed as "Target crashed" -- a fact about the box, not the
	// app, which should not fail a run alone. On 32GB/12 cores that is rare, and
	// the retry costs a full duplicate run of every failure: 25 of them in the
	// 15 Sep run, each up to a timeout long.
	//
	// Kept at 1 by default because `trace: 'on-first-retry'` below produces
	// nothing without it, and the trace is what makes a failure diagnosable.
	// PLAYWRIGHT_RETRIES=0 halves the cost of a run you are iterating on and
	// already know is red.
	retries: setting('PLAYWRIGHT_RETRIES') ? Number(setting('PLAYWRIGHT_RETRIES')) : 1,
	// Half the cores by default (playwright's own rule): 6 on a 12-core box.
	// PLAYWRIGHT_WORKERS raises it without editing this file, which matters
	// because scripts/test-all.sh does not forward flags to playwright.
	//
	// The ceiling is not the core count but the MEMORY: the E2E_WORKERS vite
	// servers are already resident before a single browser starts, and a
	// chromium that loses that race dies mid-step with "Target crashed" or an
	// assertion whose Received is undefined -- failures that read as facts
	// about the app and are not. 8 browsers alongside 8 vite servers wants
	// ~32GB; on a smaller box leave this alone.
	// One playwright worker per worker SITE, and never more than one worker on a
	// site: SEED_TAG derives from the site, and the cleanup helpers delete by
	// that tag, so two workers sharing a site means one scenario's teardown
	// destroys another's data mid-run. workerSlot() in steps/fixtures.ts throws
	// rather than share, so a run asking for too many fails loudly.
	//
	// The two chromium projects own opposite halves and playwright interleaves
	// them (they declare no `dependencies`), so at PLAYWRIGHT_WORKERS=4 each
	// project's half is fully busy and all 8 sites are in use at once. Wanting
	// more parallelism than that means seeding more sites, not packing more
	// workers onto the ones that exist.
	workers: setting('PLAYWRIGHT_WORKERS') ? Number(setting('PLAYWRIGHT_WORKERS')) : undefined,
	// No webServer: the suite needs one dev server *per worker*, each with its
	// own .env and its own site, which a single command cannot express. They are
	// started beforehand by
	//
	//     scripts/e2e-workers.sh start
	//
	// and nginx routes wN.dev.medica.im to the matching port. A webServer entry
	// here would additionally start a fifth Vite on :3000 that contends with
	// them over the shared pre-bundling cache in node_modules/.vite, and its
	// `port` form would silently override the per-worker baseURL besides.
	use: {
		// Worker 0's site, and the value the baseURL fixture in steps/fixtures.ts
		// shadows per worker. It has to be declared here all the same: the
		// fixture overrides an *option*, and an option absent from the config is
		// not one the `page` fixture resolves against.
		//
		// The bare origin. A base path cannot live here: a leading-slash goto
		// resolves against the origin and drops it, so the prefix is applied by
		// the `page` fixture in steps/fixtures.ts instead.
		baseURL: apiOrigin(0),
		trace: 'on-first-retry'
	},
	projects: [
		// One chromium project over ALL the worker sites, not one per shape.
		//
		// Half the sites are served under a base path and half at their root
		// (scripts/e2e-workers.sh), so a worker exercises whichever shape its own
		// site has. Every scenario therefore runs in both shapes across a run,
		// without splitting the pool: 8 sites means 8 workers, each owning one
		// site outright.
		//
		// The earlier arrangement gave each SHAPE its own project with half the
		// sites, which capped parallelism at 4 and left the other 4 vite servers
		// idle -- playwright runs projects one after another, so the halves never
		// overlapped. Splitting by shape was the mistake; the shape belongs to
		// the site, not to the project.
		{
			name: 'chromium',
			testDir,
			testIgnore: pixelMatch,
			use: { ...devices['Desktop Chrome'], workerPoolSize: E2E_WORKERS }
		},
		// The pixel-sensitive features, one worker and no parallelism, after the
		// project above. They measure and drag real layout boxes, and under
		// contention report a box that is briefly wrong or a drag that never
		// lands -- failures that read as product bugs and are not.
		{
			name: 'chromium-serial',
			testDir,
			testMatch: pixelMatch,
			fullyParallel: false,
			workers: 1,
			use: { ...devices['Desktop Chrome'], workerPoolSize: E2E_WORKERS }
		},
		{
			// Plain Playwright specs, alongside the generated Gherkin ones. Some
			// behaviour is not a rule about the domain and reads badly as a
			// scenario — that a dropdown is drawn where a click can reach it is a
			// fact about a library's positioning, not something the business would
			// recognise. Those live here, sharing the suite's per-worker baseURL
			// and its globalSetup.
			//
			// testMatch is anchored to this directory so tests/sites/ below is not
			// swept in: those specs are about one site and would fail against a
			// worker serving another.
			name: 'specs',
			testDir: './tests',
			testMatch: /tests\/[^/]+\.spec\.ts$/,
			use: { ...devices['Desktop Chrome'] }
		},
		{
			// The avatar cropper, in Firefox.
			//
			// Everything else runs in Chromium only, which is a deliberate
			// trade: the suite takes ~8 minutes as it is, and a second browser
			// across all of it would double that on a machine that is also
			// somebody's workstation. The cropper is the exception because it is
			// the one feature built on a third-party web component that measures
			// and drags real layout boxes — cropperjs positions its selection
			// from getBoundingClientRect and moves it by pointer events, which is
			// exactly the class of thing engines disagree about. A crop that is
			// the wrong size, or handles that will not drag, is invisible to a
			// Chromium-only suite.
			//
			// Scoped to this one feature by testMatch so it costs about a minute.
			// Run it alone with:
			//     pnpm exec playwright test --project=firefox-cropper
			name: 'firefox-cropper',
			testDir,
			testMatch: /avatar-crop-preview\.feature\.spec\.js$/,
			// Serial, like chromium-serial above and for the same reason: this
			// is a PIXEL_SENSITIVE feature, and the protection belongs to the
			// feature rather than to the project that happens to run it.
			// avatar-crop-preview was serialised in Chromium and left fully
			// parallel here, so the same scenario kept timing out in Firefox
			// waiting 60s for a button while eight workers fought over the box.
			// Affordable because testMatch scopes this project to one feature.
			fullyParallel: false,
			workers: 1,
			use: { ...devices['Desktop Firefox'] }
		},
		// Specs about one site in particular.
		//
		// Most of the suite is site-agnostic, but this is a multi-tenant
		// codebase and some pages exist for a single tenant: the contact page
		// is in Lyon 3's skvar branch and sante-gadagne has no such route. A
		// spec here names its site and browses that site's origin, so it is
		// never measured against whichever worker happens to be running.
		//
		// Deliberately no baseURL: each spec resolves its own from
		// tests/sites/sites.ts, and inheriting the worker's would silently
		// point it at the wrong tenant.
		//
		// Grouped one project per tenant, so each site's specs are a block
		// addressed to one server rather than scattered through an
		// alphabetical list:
		//
		//     pnpm exec playwright test --project=sites-lyon3     # one tenant
		//     pnpm exec playwright test --project=sites-annuaire
		//
		// Run them all with the `sites` grep, which still names every spec:
		//
		//     pnpm exec playwright test --project=sites
		...siteProjects()
	]
});

/**
 * The `sites` project, split one per tenant, plus `sites` itself over all of
 * them.
 *
 * Named `sites-<dev.yml context>` (sites-lyon3), so a project is called what
 * you would type at scripts/dev.sh to serve it — the two things you need
 * together, since a tenant's specs can only run while its server is up.
 *
 * Grouping and parallelism answer different questions and are both wanted here.
 * Grouping decides *which server* a block of specs belongs to, which is what
 * makes one tenant runnable on its own and keeps a spec from being measured
 * against another site. fullyParallel decides how fast each block runs once its
 * server is up.
 */
function siteProjects() {
	const chrome = { ...devices['Desktop Chrome'] };
	// Every tenant's dev server runs at once — each has its own port and its own
	// --mode (scripts/test-all.sh's ensure_all_site_servers) — so no spec is
	// waiting for a server to be switched between tenants.
	//
	// fullyParallel on these projects and not on the suite as a whole, because
	// the two halves are parallel for different reasons. The BDD projects are
	// capped at one worker per dev server: a worker browses its own
	// wN.dev.medica.im and owns that server's dataset (apiOrigin() in
	// tests/fixtures/session.ts), so a fifth worker would have no server behind
	// it. These specs resolve a fixed tenant origin instead, never apiOrigin,
	// and only read — layout measurements, contrast readings, and clone requests
	// that assert on a refusal — so any number can share one site server.
	const common = { testDir: SITES_DIR, fullyParallel: true, use: chrome };

	const perTenant = [...specsBySite(SITES_DIR)].map(([site, files]) => ({
		...common,
		name: `sites-${SITE_CONTEXTS[site]?.context ?? site}`,
		// Anchored to the files this tenant owns, so no other tenant's spec can
		// be swept in by a loose glob.
		testMatch: new RegExp(`/(${files.map((f) => f.replace(/\./g, '\\.')).join('|')})$`)
	}));

	// `sites` kept as a name, because --project matches exactly and both the
	// commands above and scripts/test-all.sh ask for it.
	//
	// It carries no tests of its own: matching *.spec.ts here would make it a
	// second copy of every tenant's project, and a plain `playwright test` runs
	// every project — so all 22 site specs would run twice, spending exactly the
	// capacity the grouping is meant to free. `dependencies` makes asking for
	// `sites` pull in each tenant's project instead, which is what asking for
	// "the site specs" is supposed to mean.
	return [
		...perTenant,
		{
			...common,
			name: 'sites',
			dependencies: perTenant.map((p) => p.name),
			// Matches nothing: this project is the name, its dependencies are the work.
			testMatch: /(?!)/
		}
	];
}
