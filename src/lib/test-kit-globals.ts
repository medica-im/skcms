/**
 * What SvelteKit's client sets up before any app code runs, for the component
 * project, which mounts components without starting the client.
 *
 * SvelteKit 3 generates $app/env/public as a module that reads
 * `globalThis.__sveltekit_dev` as it is imported (the dev payload the client
 * start fills in). Without it, every component test file that reaches that
 * module, through the env, the paths or the directory store, fails to load
 * with "Cannot destructure property 'env'" before a test runs.
 *
 * The values the app declares static are inlined into the module itself, so
 * the payload only has to exist, and be empty.
 */
const holder = globalThis as unknown as { __sveltekit_dev?: Record<string, unknown> };

holder.__sveltekit_dev ??= { env: {} };
