import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { moduleExists } from './module-exists.js';
import { resolveNameOrAbsPath } from './resolve-name-or-abs-path.js';

const dir = path.resolve('/project', 'a', 'b');

describe('A relative path that happens to exist where Markuplint is installed', () => {
	// `import()` and `require.resolve()` resolve a relative specifier against the file
	// that calls them, i.e. `module-exists.ts`. `../package.json` is
	// the `package.json` of this package, so `moduleExists()` says "it exists".
	test('precondition: moduleExists() resolves it against its own location', async () => {
		expect(await moduleExists('../package.json')).toBe(true);
	});

	test.each(['../package.json', './resolve-name-or-abs-path.ts', '../src', '..'])(
		'%s is resolved against the directory, not left as it is',
		async specifier => {
			expect(await resolveNameOrAbsPath(dir, specifier)).toBe(path.resolve(dir, specifier));
		},
	);

	test('keeps the bang prefix', async () => {
		expect(await resolveNameOrAbsPath(dir, '!../package.json')).toBe(`!${path.resolve(dir, '../package.json')}`);
	});
});

describe('A path that does not exist anywhere', () => {
	test.each(['./x.json', '../x.json', '../../../../x.json'])(
		'%s is resolved against the directory',
		async specifier => {
			expect(await resolveNameOrAbsPath(dir, specifier)).toBe(path.resolve(dir, specifier));
		},
	);

	test('an absolute path stays', async () => {
		const abs = path.resolve('/somewhere/x.json');
		expect(await resolveNameOrAbsPath(dir, abs)).toBe(abs);
	});
});

describe('A module name', () => {
	test('an installed package is left as it is', async () => {
		expect(await resolveNameOrAbsPath(dir, 'vitest')).toBe('vitest');
	});

	test('a subpath of an installed package is left as it is', async () => {
		expect(await resolveNameOrAbsPath(dir, 'vitest/package.json')).toBe('vitest/package.json');
	});

	test.each(['markuplint:recommended', 'plugin:foo/bar'])('%s is left as it is', async name => {
		expect(await resolveNameOrAbsPath(dir, name)).toBe(name);
	});

	test('a bare name that is not installed is resolved against the directory', async () => {
		expect(await resolveNameOrAbsPath(dir, 'not-installed/x.json')).toBe(path.resolve(dir, 'not-installed/x.json'));
	});

	test('a glob is resolved against the directory', async () => {
		expect(await resolveNameOrAbsPath(dir, '!**/*.html')).toBe(`!${path.resolve(dir, '**/*.html')}`);
	});
});
