import path from 'node:path';

import { isPluginModuleName } from './is-plugin-module-name.js';
import { isPresetModuleName } from './is-preset-module-name.js';
import { moduleExists } from './module-exists.js';

export async function resolveNameOrAbsPath(dir: string, pathOrModName: string) {
	const bangAndPath = /^(!)(.*)/.exec(pathOrModName) ?? [];
	const bang = bangAndPath[1] ?? '';
	const pathname = bangAndPath[2] ?? pathOrModName;

	// A path (`./`, `../`, absolute) is resolved from `dir`, the directory of the file that
	// declares it. `moduleExists()` resolves it from where Markuplint is installed instead, and a
	// file there could make it "exist" and keep it relative.
	const isPath = path.isAbsolute(pathname) || /^\.\.?(?:[/\\]|$)/.test(pathname);

	if (
		!isPath &&
		((await moduleExists(pathOrModName)) || isPresetModuleName(pathOrModName) || isPluginModuleName(pathOrModName))
	) {
		return pathOrModName;
	}

	return bang + path.resolve(dir, pathname);
}
