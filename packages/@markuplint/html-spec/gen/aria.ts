/* global cheerio */

import type {
	ARIAProperty,
	ARIAAttributeValue,
	ARIARoleOwnedProperties,
	ARIAVersion,
	ARIARoleInSchema,
	EquivalentHtmlAttr,
} from '@markuplint/ml-spec';
import type { WritableDeep } from 'type-fest';

import fetch from './fetch';
import { arrayUnique, nameCompare } from './utils';

export async function getAria() {
	const roles12 = await getRoles('1.2');
	const roles11 = await getRoles('1.1');

	return {
		'1.2': {
			roles: roles12,
			props: await getProps('1.2', roles12),
			graphicsRoles: await getRoles('1.2', true),
		},
		'1.1': {
			roles: roles11,
			props: await getProps('1.1', roles11),
			graphicsRoles: await getRoles('1.1', true),
		},
	};
}

async function getRoles(version: ARIAVersion, graphicsAria = false) {
	const $ = await fetch(
		(() => {
			if (!graphicsAria) {
				return `https://www.w3.org/TR/wai-aria-${version}/`;
			}
			return version === '1.1'
				? 'https://www.w3.org/TR/graphics-aria-1.0/'
				: 'https://w3c.github.io/graphics-aria/';
		})(),
	);
	const $roleList = $('#role_definitions section.role');
	const roles: ARIARoleInSchema[] = [];
	const getAttr = (
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		li: cheerio.Element,
	): ARIARoleOwnedProperties => {
		const $li = $(li);
		const text = $li.text();
		const isDeprecated = /deprecated/i.test(text) || undefined;
		const $a = $li.find('a');
		const name = $a.length
			? $a
					.text()
					.replace(/\s*\(\s*state\s*\)\s*/i, '')
					.trim()
			: text.trim();
		return {
			name,
			deprecated: isDeprecated,
		};
	};

	$roleList.each((_, el) => {
		const $el = $(el);
		const name = $el.find('.role-name').attr('title')?.trim() || '';
		const description = $el
			.find('.role-description p')
			.toArray()
			.map(p => $(p).text().trim().replace(/\s+/g, ' ').replace(/\t+/g, ''))
			.join('\n\n');
		const $features = $el.find('.role-features tr');
		const generalization = $features
			.find('.role-parent a')
			.toArray()
			.map(a => $(a).text().trim());
		const isAbstract = $features.find('.role-abstract').text().trim().toLowerCase() === 'true' || undefined;
		let $ownedRequiredProps = $features.find('.role-required-properties li').toArray();
		if (!$ownedRequiredProps.length) {
			$ownedRequiredProps = $features.find('.role-required-properties').toArray();
		}
		const ownedRequiredProps = $ownedRequiredProps.map(getAttr).map(p => ({ ...p, required: true as const }));
		const ownedInheritedProps = $features
			.find('.role-inherited li')
			.toArray()
			.map(getAttr)
			.map(p => ({ ...p, inherited: true as const }));
		const ownedProps = $features.find('.role-properties li, .role-properties > a').toArray().map(getAttr);
		const requiredContextRole = $$($features, ['.role-scope li', '.role-scope a'])
			.toArray()
			.map(el => $(el).text().trim());
		const requiredOwnedElements = $$($features, ['.role-mustcontain li', '.role-mustcontain a'])
			.toArray()
			.map(el =>
				$(el)
					.text()
					.trim()
					.replace(/\s+(owning|→)\s+/gi, ' > '),
			);
		const accessibleNameRequired = !!$features.find('.role-namerequired').text().match(/true/i);
		const accessibleNameFromAuthor = !!$features
			.find('.role-namefrom')
			.text()
			.match(/author/i);
		const accessibleNameFromContent = !!$features
			.find('.role-namefrom')
			.text()
			.match(/content/i);
		const accessibleNameProhibited = !!$features
			.find('.role-namefrom')
			.text()
			.match(/prohibited/i);
		const $childrenPresentational = $features.find('.role-childpresentational').text();
		const childrenPresentational = $childrenPresentational.match(/true/i)
			? true
			: $childrenPresentational.match(/false/i)
			? false
			: undefined;
		const ownedProperties = arrayUnique(
			[...ownedRequiredProps, ...ownedInheritedProps, ...ownedProps].sort(nameCompare),
		);
		const prohibitedProperties = $features
			.find('.role-disallowed li code')
			.toArray()
			.map(el => $(el).text().trim());
		roles.push({
			name,
			description,
			isAbstract,
			generalization,
			requiredContextRole,
			requiredOwnedElements,
			accessibleNameRequired,
			accessibleNameFromAuthor,
			accessibleNameFromContent,
			accessibleNameProhibited,
			childrenPresentational,
			ownedProperties,
			prohibitedProperties,
		});
	});

	// the "none" role is synonym
	const presentationRole = roles.find(role => role.name === 'presentation');
	if (presentationRole) {
		const noneRoleIndex = roles.findIndex(role => role.name === 'none');
		roles[noneRoleIndex] = {
			...presentationRole,
			name: 'none',
			description: roles[noneRoleIndex]?.description,
		};
	}

	roles.sort(nameCompare);

	return roles;
}

async function getProps(version: ARIAVersion, roles: readonly ARIARoleInSchema[]) {
	const $ = await fetch(`https://www.w3.org/TR/wai-aria-${version}/`);

	const ariaNameList: Set<string> = new Set();
	for (const role of roles) {
		role.ownedProperties?.forEach(prop => {
			ariaNameList.add(prop.name);
		});
	}

	const { implicitProps } = await getAriaInHtml();

	const globalStatesAndProperties = $('#global_states li a')
		.toArray()
		.map(el => $(el).attr('href')?.replace('#', ''))
		.filter((s): s is string => !!s);
	const arias = Array.from(ariaNameList)
		.sort()
		.map((name): ARIAProperty => {
			const $section = $(`#${name}`);
			const className = $section.attr('class');
			const type = className && /property/i.test(className) ? 'property' : 'state';
			const deprecated = (className && /deprecated/i.test(className)) || undefined;
			const $value = $section.find(`table.${type}-features .${type}-value, .state-features .property-value`);
			const value = $value.text().trim() as ARIAAttributeValue;
			const $valueDescriptions = $section.find('table.value-descriptions tbody tr');
			const valueDescriptions: Record<string, string> = {};
			$valueDescriptions.each((_, $tr) => {
				const name = $($tr)
					.find('.value-name')
					.text()
					.replace(/\(default\)\s*:?/gi, '')
					.trim();
				const desc = $($tr).find('.value-description').text().trim();
				valueDescriptions[name] = desc;
			});
			const enumValues: string[] = [];
			if (value === 'token' || value === 'token list') {
				const values = $valueDescriptions
					.find('.value-name')
					.toArray()
					.map(el =>
						$(el)
							.text()
							.replace(/\(default\)\s*:?/gi, '')
							.trim(),
					);
				enumValues.push(...values);
			}
			const $defaultValue = $section.find('table.value-descriptions .value-name .default');
			const defaultValue =
				$defaultValue
					.text()
					.replace(/\(default\)/gi, '')
					.trim() || undefined;
			const isGlobal = globalStatesAndProperties.includes(name) || undefined;

			let equivalentHtmlAttrs: EquivalentHtmlAttr[] | undefined;
			const implicitOwnProps = implicitProps.filter(p => p.name === name);
			if (implicitOwnProps.length) {
				equivalentHtmlAttrs = implicitOwnProps.map(attr => ({
					htmlAttrName: attr.htmlAttrName,
					value: attr.value,
				}));
			}

			const aria: WritableDeep<ARIAProperty> = {
				name,
				type,
				deprecated,
				value,
				enum: enumValues,
				defaultValue,
				isGlobal,
				equivalentHtmlAttrs,
				valueDescriptions: Object.keys(valueDescriptions).length ? valueDescriptions : undefined,
			};

			// Conditional Value
			switch (name) {
				case 'aria-checked': {
					aria.value = 'true/false';
					aria.conditionalValue = [
						{
							role: ['checkbox', 'menuitemcheckbox'],
							value: 'tristate',
						},
					];
					break;
				}
				case 'aria-hidden': {
					aria.equivalentHtmlAttrs?.forEach(attr => {
						if (attr.htmlAttrName === 'hidden') {
							attr.isNotStrictEquivalent = true;
						}
					});
					break;
				}
			}

			return aria;
		});

	arias.sort(nameCompare);

	return arias;
}

async function getAriaInHtml() {
	const $ = await fetch('https://www.w3.org/TR/html-aria/');
	const implicitProps: { name: string; value: string | null; htmlAttrName: string }[] = [];
	const $implicitProps = $(
		'#requirements-for-use-of-aria-attributes-in-place-of-equivalent-html-attributes table tbody tr',
	).toArray();
	for (const $implicitProp of $implicitProps) {
		const htmlAttrName = $($implicitProp).find('th:nth-of-type(1) a').eq(0).text();
		if (htmlAttrName === 'contenteditable') {
			// FIXME:
			// Cannot design yet because the contenteditable attribute is evaluated with ancestors.
			continue;
		}
		const implicitProp = $($implicitProp).find('td:nth-of-type(1) code').eq(0).text();
		const [name, _value] = implicitProp.split('=');
		if (!name) {
			continue;
		}

		const value = _value?.replace(/"|'/g, '').trim() ?? null;
		const data = {
			name: name,
			value: value === '...' ? null : value,
			htmlAttrName,
		};
		implicitProps.push(data);
	}
	return {
		implicitProps,
	};
}

function $$(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	$el: cheerio.Cheerio,
	selectors: readonly string[],
) {
	let $found = $el;
	for (const selector of selectors) {
		$found = $el.find(selector);
		if ($found.length) {
			return $found;
		}
	}
	return $found;
}
