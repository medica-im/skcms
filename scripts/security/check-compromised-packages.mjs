#!/usr/bin/env node
/**
 * Looks for known-compromised npm packages on this machine.
 *
 * The indicator list comes from Wiz Research and pins exact versions: a package
 * name on its own is not a finding, because most of these names are legitimate
 * packages that were compromised for one or two releases. Only the pinned
 * versions are malicious, so this reports name+version matches and counts a
 * name-only match as a separate, weaker signal worth a look.
 *
 * Two sources are searched, because neither alone is complete:
 *
 *   installed   every package.json under a node_modules directory — what is
 *               actually on disk and could run.
 *   lockfiles   package-lock.json, pnpm-lock.yaml, yarn.lock — what would be
 *               installed by a fresh `install`, including projects whose
 *               dependencies are not currently installed.
 *
 * Usage:
 *   node scripts/security/check-compromised-packages.mjs [roots...] [options]
 *
 *   --refresh     re-download the indicator list before scanning
 *   --json        machine-readable output
 *   --quiet       print findings only
 *   --all-roots   scan the whole home directory (slow, thorough)
 *
 * Exit status: 0 clean, 1 findings, 2 the scan itself failed. A non-zero exit
 * on findings is what makes this usable from CI or a pre-commit hook.
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const CSV_PATH = join(HERE, 'keyv-packages.csv');
const CSV_URL =
	'https://raw.githubusercontent.com/wiz-sec-public/wiz-research-iocs/refs/heads/main/reports/keyv-packages.csv';

/** Directories that never contain installed packages and cost time to walk. */
const SKIP_DIRS = new Set([
	'.git',
	'.svn',
	'.hg',
	'.cache',
	'.venv',
	'venv',
	'__pycache__',
	'.next',
	'.svelte-kit',
	'.turbo',
	'dist',
	'build',
	'coverage',
	'target',
	'.gradle',
	'.m2',
	'snap',
	'.steam',
	'.local/share/Trash'
]);

const argv = process.argv.slice(2);
const options = {
	refresh: argv.includes('--refresh'),
	json: argv.includes('--json'),
	quiet: argv.includes('--quiet'),
	allRoots: argv.includes('--all-roots')
};
const roots = argv.filter((a) => !a.startsWith('--'));

const log = (...args) => {
	if (!options.quiet && !options.json) console.log(...args);
};

/**
 * Parses the indicator CSV into name -> Set(versions).
 *
 * The file has two columns and no quoting, and every constraint is an exact
 * `==` pin joined by `||`. Anything that is not an exact pin is deliberately
 * dropped rather than guessed at: a range this parser misread would produce
 * either a false alarm or, worse, a silent miss.
 */
function parseIndicators(text) {
	const map = new Map();
	const unparsed = [];
	const lines = text.split(/\r?\n/);

	for (const line of lines.slice(1)) {
		const row = line.trim();
		if (!row) continue;

		const comma = row.indexOf(',');
		if (comma === -1) continue;

		const name = row.slice(0, comma).trim();
		const constraint = row.slice(comma + 1).trim();
		if (!name) continue;

		const versions = new Set();
		for (const part of constraint.split('||')) {
			const pin = part.trim();
			if (pin.startsWith('==')) {
				versions.add(pin.slice(2).trim());
			} else if (pin) {
				unparsed.push(`${name}: ${pin}`);
			}
		}
		if (versions.size) map.set(name, versions);
	}
	return { map, unparsed };
}

async function refreshIndicators() {
	log(`Downloading indicator list…`);
	const response = await fetch(CSV_URL);
	if (!response.ok) throw new Error(`GET ${CSV_URL} -> ${response.status}`);
	const text = await response.text();

	// Guard against writing a truncated or error-page body over a good list.
	const { map } = parseIndicators(text);
	if (map.size < 100) {
		throw new Error(`downloaded list has only ${map.size} usable entries — refusing to save it`);
	}
	writeFileSync(CSV_PATH, text);
	log(`Saved ${map.size} packages to ${CSV_PATH}`);
	return text;
}

/** Default scan roots: where packages actually accumulate on a dev machine. */
function defaultRoots() {
	const home = homedir();
	if (options.allRoots) return [home];

	return [
		process.cwd(),
		join(home, 'git'),
		join(home, 'projects'),
		join(home, 'src'),
		join(home, 'code'),
		join(home, 'dev'),
		join(home, 'work'),
		// Globally installed tools run with the user's privileges, so they matter
		// as much as anything in a project.
		join(home, '.local/share/pnpm/global'),
		join(home, '.local/share/pnpm/store'),
		join(home, '.config/yarn/global'),
		join(home, '.npm-global'),
		join(home, '.nvm/versions'),
		'/usr/local/lib/node_modules',
		'/usr/lib/node_modules'
	].filter((p) => existsSync(p));
}

const findings = [];
const nameOnly = [];
const seenPackages = new Set();
let installedCount = 0;
let lockfileCount = 0;

function record(list, entry) {
	// One line per package+version+source, so a package hoisted into several
	// projects is not reported dozens of times.
	const key = `${entry.source}|${entry.name}|${entry.version}|${entry.path}`;
	if (seenPackages.has(key)) return;
	seenPackages.add(key);
	list.push(entry);
}

/** Checks one name+version pair against the indicators. */
function check(indicators, name, version, path, source) {
	const bad = indicators.get(name);
	if (!bad) return;

	if (version && bad.has(version)) {
		record(findings, { name, version, path, source, versions: [...bad] });
	} else {
		record(nameOnly, { name, version: version ?? '(unknown)', path, source, versions: [...bad] });
	}
}

/**
 * Walks a tree looking for installed packages and lockfiles.
 *
 * Symlinks are not followed: pnpm's node_modules is a dense web of links into
 * the store, and following them turns a scan into an endless walk of the same
 * files. The store itself is scanned directly instead.
 */
async function walk(dir, indicators, depth = 0) {
	if (depth > 12) return;

	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return; // unreadable directory: permissions, or it vanished mid-scan
	}

	for (const entry of entries) {
		const full = join(dir, entry.name);

		if (entry.isFile()) {
			if (
				entry.name === 'package-lock.json' ||
				entry.name === 'pnpm-lock.yaml' ||
				entry.name === 'yarn.lock'
			) {
				await scanLockfile(full, indicators);
			}
			continue;
		}

		if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
		if (SKIP_DIRS.has(entry.name)) continue;

		if (entry.name === 'node_modules') {
			await scanNodeModules(full, indicators);
			continue;
		}
		if (entry.name.startsWith('.') && depth > 0) continue;

		await walk(full, indicators, depth + 1);
	}
}

/**
 * Reads the package.json of every package inside a node_modules directory.
 *
 * The manifest is the authority on what a package really is — a directory name
 * can be renamed or hoisted, but the name and version inside package.json are
 * what npm resolved and what the code will report about itself.
 */
async function scanNodeModules(dir, indicators, depth = 0) {
	if (depth > 6) return;

	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const full = join(dir, entry.name);

		// Scoped packages (@scope/name) nest one level deeper.
		if (entry.name.startsWith('@')) {
			await scanNodeModules(full, indicators, depth + 1);
			continue;
		}
		if (entry.name.startsWith('.')) {
			// pnpm keeps the real files under node_modules/.pnpm.
			if (entry.name === '.pnpm') await scanNodeModules(full, indicators, depth + 1);
			continue;
		}

		const manifest = join(full, 'package.json');
		try {
			const raw = await readFile(manifest, 'utf8');
			const pkg = JSON.parse(raw);
			if (pkg.name) {
				installedCount++;
				check(indicators, pkg.name, pkg.version, full, 'installed');
			}
		} catch {
			// Not a package directory, or an unparsable manifest — either way there
			// is nothing to compare.
		}

		// Nested dependencies.
		const nested = join(full, 'node_modules');
		if (existsSync(nested)) await scanNodeModules(nested, indicators, depth + 1);
	}
}

/**
 * Extracts name/version pairs from a lockfile.
 *
 * Lockfiles are read as text rather than fully parsed: three formats across
 * several versions each is a lot of surface, and a regex over the entries that
 * carry a resolved version is enough to notice a pinned bad release. This can
 * only over-report, never under-report, which is the right direction for a
 * security check.
 */
async function scanLockfile(file, indicators) {
	let text;
	try {
		text = await readFile(file, 'utf8');
	} catch {
		return;
	}
	lockfileCount++;

	const found = new Set();

	if (file.endsWith('package-lock.json')) {
		try {
			const data = JSON.parse(text);
			// v2/v3 "packages" keyed by path, and v1 "dependencies" keyed by name.
			for (const [key, value] of Object.entries(data.packages ?? {})) {
				const name = value?.name ?? key.split('node_modules/').pop();
				if (name && value?.version) found.add(`${name} ${value.version}`);
			}
			const walkDeps = (deps) => {
				for (const [name, value] of Object.entries(deps ?? {})) {
					if (value?.version) found.add(`${name} ${value.version}`);
					if (value?.dependencies) walkDeps(value.dependencies);
				}
			};
			walkDeps(data.dependencies);
		} catch {
			return;
		}
	} else if (file.endsWith('pnpm-lock.yaml')) {
		// Entries look like  /@scope/name@1.2.3:  or  '@scope/name@1.2.3':
		for (const match of text.matchAll(/^\s{2}'?\/?((?:@[^/\s']+\/)?[^@\s':/]+)@([^\s':()]+)/gm)) {
			found.add(`${match[1]} ${match[2]}`);
		}
	} else if (file.endsWith('yarn.lock')) {
		// A block header naming the package, then an indented `version "x.y.z"`.
		let current = null;
		for (const line of text.split(/\r?\n/)) {
			const header = line.match(/^"?((?:@[^/\s"]+\/)?[^@\s"]+)@/);
			if (header && !line.startsWith(' ')) {
				current = header[1];
				continue;
			}
			const version = line.match(/^\s+version\s+"([^"]+)"/);
			if (version && current) found.add(`${current} ${version[1]}`);
		}
	}

	for (const pair of found) {
		const [name, version] = pair.split(' ');
		check(indicators, name, version, file, 'lockfile');
	}
}

function report() {
	if (options.json) {
		console.log(
			JSON.stringify(
				{
					scanned: { installed: installedCount, lockfiles: lockfileCount },
					findings,
					nameOnlyMatches: nameOnly
				},
				null,
				2
			)
		);
		return;
	}

	log('');
	log(`Scanned ${installedCount} installed packages and ${lockfileCount} lockfiles.`);
	log('');

	if (findings.length) {
		console.log(`[31m✗ ${findings.length} COMPROMISED package(s) found[0m`);
		console.log('');
		for (const f of findings) {
			console.log(`  [31m${f.name}@${f.version}[0m  (${f.source})`);
			console.log(`      ${f.path}`);
		}
		console.log('');
		console.log('  These are the exact versions flagged as malicious.');
		console.log('  Remove them, then rotate any credential that was readable');
		console.log('  from a machine where they ran (npm tokens, SSH keys, cloud keys).');
	} else {
		console.log('[32m✓ No compromised package versions found[0m');
	}

	if (nameOnly.length) {
		console.log('');
		console.log(
			`[33m! ${nameOnly.length} package(s) share a name with the list, at a different version[0m`
		);
		console.log('  Not a finding — these versions are not the flagged ones — but worth a glance:');
		console.log('');
		const shown = nameOnly.slice(0, 20);
		for (const n of shown) {
			console.log(`  ${n.name}@${n.version}  (flagged: ${n.versions.join(', ')})`);
		}
		if (nameOnly.length > shown.length) {
			console.log(`  … and ${nameOnly.length - shown.length} more (use --json for all)`);
		}
	}
}

async function main() {
	let csv;
	if (options.refresh) {
		csv = await refreshIndicators();
	} else if (existsSync(CSV_PATH)) {
		csv = readFileSync(CSV_PATH, 'utf8');
	} else {
		csv = await refreshIndicators();
	}

	const { map: indicators, unparsed } = parseIndicators(csv);
	if (!indicators.size) throw new Error('the indicator list is empty — nothing to check against');

	const age = existsSync(CSV_PATH)
		? Math.floor((Date.now() - statSync(CSV_PATH).mtimeMs) / 86_400_000)
		: 0;

	log(`Checking against ${indicators.size} compromised packages (list is ${age} day(s) old).`);
	if (age > 7 && !options.refresh) log(`  Consider --refresh for the current list.`);
	if (unparsed.length) {
		log(`  Note: ${unparsed.length} constraint(s) were not exact pins and were skipped.`);
	}

	const scanRoots = (roots.length ? roots : defaultRoots()).map((r) => resolve(r));

	// Drop roots already covered by a parent, so a tree is not walked twice.
	const deduped = scanRoots.filter(
		(r) => !scanRoots.some((other) => other !== r && r.startsWith(other + sep))
	);

	log(`Scanning: ${deduped.join(', ')}`);

	for (const root of deduped) {
		if (!existsSync(root)) continue;
		await walk(root, indicators);
	}

	report();
	process.exit(findings.length ? 1 : 0);
}

main().catch((error) => {
	console.error(`[31mScan failed:[0m ${error.message}`);
	process.exit(2);
});
