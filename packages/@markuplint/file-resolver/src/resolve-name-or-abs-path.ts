import path from 'node:path';

import { isPluginModuleName } from './is-plugin-module-name.js';
import { isPresetModuleName } from './is-preset-module-name.js';
import { moduleExists } from './module-exists.js';
import { isPathSpecifier } from './path-utils.js';

export async function resolveNameOrAbsPath(dir: string, pathOrModName: string) {
	const bangAndPath = /^(!)(.*)/.exec(pathOrModName) ?? [];
	const bang = bangAndPath[1] ?? '';
	const pathname = bangAndPath[2] ?? pathOrModName;

	// A specifier spelled as a path (`./`, `../`, absolute) is never a module name.
	// Asking `moduleExists()` about it would resolve it against where Markuplint is
	// installed, not against `dir`, and a file there could make it "exist".
	if (
		!isPathSpecifier(pathname) &&
		((await moduleExists(pathOrModName)) || isPresetModuleName(pathOrModName) || isPluginModuleName(pathOrModName))
	) {
		return pathOrModName;
	}

	return bang + path.resolve(dir, pathname);
}
