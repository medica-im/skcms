import { describe, it, expect, vi, afterEach } from 'vitest';
import { requireSite } from '../../tests/sites/sites';

/**
 * What the site guard says when a tenant's specs cannot run.
 *
 * `requireSite` refuses to run a site's specs unless that site is being served,
 * so a spec cannot measure nginx's 502 page and report it as a layout
 * regression. That part works. What it said about *why* did not.
 *
 * The message asserted "is not serving <site>" and told the reader to start the
 * server — for every failure, including a timeout. But a timeout does not mean
 * nothing is listening: two carehome specs failed this way while annuaire's
 * server was up on :3010 and answering, just slowly. The box was running eight
 * e2e worker servers, three site servers and a 5.6-minute feature file, and the
 * guard's first request did not come back inside its budget. Playwright marked
 * both flaky — they passed on retry — and the origin answered 200 in 0.2s once
 * the machine was quiet.
 *
 * So the advice was wrong in the one case it most needed to be right: it sent
 * somebody to restart a healthy server, which does nothing about contention and
 * costs a run to find out. A guard that cannot tell "absent" from "starved" must
 * at least not claim to know which it is.
 *
 * These tests pin the distinction. They stub `fetch` rather than needing a
 * server: what is under test is what the guard concludes from a given outcome.
 */

const SITE = 'annuaire.medica.im';
const ORIGIN = 'http://dev.annuaire.medica.im';

/** How AbortSignal.timeout rejects — the shape the guard actually catches. */
const timeoutError = () => {
	const error = new Error('The operation was aborted due to timeout.');
	error.name = 'TimeoutError';
	return error;
};

afterEach(() => {
	vi.unstubAllGlobals();
});

/** Runs the guard against a stubbed fetch and returns the message it threw. */
async function guardMessage(impl: () => Promise<Response>): Promise<string> {
	vi.stubGlobal('fetch', vi.fn(impl));
	try {
		await requireSite(SITE);
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	throw new Error('the guard was expected to refuse, but it passed');
}

describe('the site guard, on why a site could not be measured', () => {
	it('passes silently when the site is served', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
		await expect(requireSite(SITE)).resolves.toBeUndefined();
	});

	it('says nothing is serving the site when nginx answers 502', async () => {
		// The case the guard was built for: one Vite process serves one tenant,
		// and nginx returns 502 for every dev.<site> whose port is dead. Here
		// "start the server" is exactly the right advice.
		const message = await guardMessage(async () => new Response('', { status: 502 }));

		expect(message).toContain('is not serving');
		expect(message).toContain('HTTP 502');
		expect(message).toContain('./scripts/dev.sh --restart annuaire');
	});

	it('does not claim a timed-out site is unserved', async () => {
		// The regression in the advice. A timeout is not evidence that nothing
		// is listening — it is evidence that no answer arrived in time, which a
		// loaded box produces on a perfectly healthy server.
		const message = await guardMessage(async () => {
			throw timeoutError();
		});

		expect(message).not.toContain('is not serving');
	});

	it('names the timeout and says the server may be up but starved', async () => {
		const message = await guardMessage(async () => {
			throw timeoutError();
		});

		expect(message).toMatch(/timed out/i);
		// The reader needs to know which explanation to check first, and on this
		// box contention is the likely one.
		expect(message).toMatch(/load|starved|contention|busy/i);
		expect(message).toContain(ORIGIN);
	});

	it('still tells a reader how to check whether the server is up', async () => {
		// Not serving is still possible on a timeout, so the guard must not
		// swing the other way and drop the restart hint entirely — it should
		// offer it as one of two explanations rather than as the diagnosis.
		const message = await guardMessage(async () => {
			throw timeoutError();
		});

		expect(message).toContain('3010');
	});

	it('reports a connection refusal as the network error it is', async () => {
		// Neither a bad status nor a timeout: nothing accepted the connection.
		// This must keep naming the failure rather than inventing a status.
		const message = await guardMessage(async () => {
			throw new Error('fetch failed');
		});

		expect(message).toContain('fetch failed');
		expect(message).toContain('./scripts/dev.sh --restart annuaire');
	});
});
