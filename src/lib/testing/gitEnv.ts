/**
 * The environment for git commands run by tests in throwaway repositories.
 *
 * Commit and tag signing are switched off for those commands only. The
 * developer's global config signs every commit with GPG, and whenever
 * gpg-agent had no cached passphrase each test commit waited a minute and
 * failed ("gpg: signing failed: Timeout") — six skvar-restore and image-tag
 * tests on 2026-10-02, for history nobody will ever verify.
 *
 * Through GIT_CONFIG_COUNT rather than `git config` in each repository, so it
 * also covers the `git init` and the first commit, and leaves the developer's
 * own config untouched.
 */
export const testGitEnv: NodeJS.ProcessEnv = {
	...process.env,
	GIT_CONFIG_COUNT: '2',
	GIT_CONFIG_KEY_0: 'commit.gpgsign',
	GIT_CONFIG_VALUE_0: 'false',
	GIT_CONFIG_KEY_1: 'tag.gpgsign',
	GIT_CONFIG_VALUE_1: 'false'
};
