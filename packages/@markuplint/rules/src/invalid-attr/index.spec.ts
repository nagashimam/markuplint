import { mlTest } from 'markuplint';
import rule from './';

test('warns if specified attribute value is invalid', async () => {
	const { violations } = await mlTest(
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(violations).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 4,
			message: 'The "invalid-attr" attribute is not allowed',
			raw: 'invalid-attr',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 33,
			message:
				'The "referrerpolicy" attribute expect either "", "no-referrer", "no-referrer-when-downgrade", "same-origin", "origin", "strict-origin", "origin-when-cross-origin", "strict-origin-when-cross-origin", "unsafe-url"',
			raw: 'invalid-value',
		},
	]);
});

test('Type check', async () => {
	const { violations } = await mlTest(
		'<form name=""></form>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(violations).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 13,
			message: 'The "name" attribute value must not be the empty string',
			raw: '',
		},
	]);
});

test('disable', async () => {
	const { violations } = await mlTest(
		'<a invalid-attr referrerpolicy="invalid-value"><img src=":::::"></a>',
		{
			rules: {
				'invalid-attr': false,
			},
		},
		[rule],
		'en',
	);

	expect(violations.length).toBe(0);
});

test('ancestor condition', async () => {
	expect(
		(
			await mlTest(
				'<picture><source media="print"></picture>',
				{
					rules: {
						'invalid-attr': true,
					},
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlTest(
				'<audio><source media="print"></audio>',
				{
					rules: {
						'invalid-attr': true,
					},
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 16,
			message: 'The "media" attribute is not allowed',
			raw: 'media',
		},
	]);
});

test('custom rule', async () => {
	const { violations } = await mlTest(
		'<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>',
		{
			rules: {
				'invalid-attr': {
					option: {
						attrs: {
							'x-attr': {
								pattern: '/[a-z]+/',
							},
						},
					},
				},
			},
		},
		[rule],
		'en',
	);

	expect(violations).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 15,
			message: 'The "x-attr" attribute expect custom pattern "/[a-z]+/"',
			raw: '123',
		},
	]);
});

test('custom rule: type', async () => {
	const { violations } = await mlTest(
		'<x-el x-attr="123"></x-el><x-el x-attr="abc"></x-el>',
		{
			rules: {
				'invalid-attr': {
					option: {
						attrs: {
							'x-attr': {
								type: 'Int',
							},
						},
					},
				},
			},
		},
		[rule],
		'en',
	);

	expect(violations).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 41,
			message: 'The "x-attr" attribute expect integer',
			raw: 'abc',
		},
	]);
});

test('custom element', async () => {
	const { violations } = await mlTest(
		'<custom-element any-attr></custom-element>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(violations.length).toBe(0);
});

test('custom element and custom rule', async () => {
	const { violations } = await mlTest(
		'<custom-element any-attr="any-string"></custom-element>',
		{
			rules: {
				'invalid-attr': true,
			},
			nodeRules: [
				{
					tagName: 'custom-element',
					rules: {
						'invalid-attr': {
							option: {
								attrs: {
									'any-attr': {
										type: 'Int',
									},
								},
							},
						},
					},
				},
			],
		},
		[rule],
		'en',
	);

	expect(violations.length).toBe(1);
});

test('prefix attribute', async () => {
	const { violations } = await mlTest(
		'<div v-bind:title="title" :class="classes" @click="click"></div>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(violations).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "v-bind:title" attribute is not allowed',
			raw: 'v-bind:title',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 27,
			message: 'The ":class" attribute is not allowed',
			raw: ':class',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			col: 44,
			line: 1,
			message: 'The "@click" attribute is not allowed',
			raw: '@click',
		},
	]);
});

test('ignore prefix attribute', async () => {
	const { violations } = await mlTest(
		'<div v-bind:title="title" :class="classes" @click="click"></div>',
		{
			rules: {
				'invalid-attr': {
					option: {
						ignoreAttrNamePrefix: ['v-bind:', ':', '@'],
					},
				},
			},
		},
		[rule],
		'en',
	);

	expect(violations.length).toBe(0);
});

test('URL attribute', async () => {
	const { violations } = await mlTest(
		'<img src="https://sample.com/path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(0);

	const { violations: violations2 } = await mlTest(
		'<img src="//sample.com/path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations2.length).toBe(0);

	const { violations: violations3 } = await mlTest(
		'<img src="//user:pass@sample.com/path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations3.length).toBe(0);

	const { violations: violations4 } = await mlTest(
		'<img src="/path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations4.length).toBe(0);

	const { violations: violations5 } = await mlTest(
		'<img src="/path/to?param=value">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations5.length).toBe(0);

	const { violations: violations6 } = await mlTest(
		'<img src="/?param=value">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations6.length).toBe(0);

	const { violations: violations7 } = await mlTest(
		'<img src="?param=value">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations7.length).toBe(0);

	const { violations: violations8 } = await mlTest(
		'<img src="path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations8.length).toBe(0);

	const { violations: violations9 } = await mlTest(
		'<img src="./path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations9.length).toBe(0);

	const { violations: violations10 } = await mlTest(
		'<img src="../path/to">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations10.length).toBe(0);

	const { violations: violations11 } = await mlTest(
		'<img src="/path/to#hash">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations11.length).toBe(0);

	const { violations: violations12 } = await mlTest(
		'<img src="#hash">',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	expect(violations12.length).toBe(0);
});

test('Foreign element', async () => {
	const { violations } = await mlTest(
		'<div><svg width="10px" height="10px" viewBox="0 0 10 10"></svg></div>',
		{
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(violations.length).toBe(0);
});

test('Pug', async () => {
	const { violations } = await mlTest(
		'button(type=buttonType)',
		{
			parser: {
				'.*': '@markuplint/pug-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(violations.length).toBe(0);
});

test('Vue', async () => {
	const { violations: violations1 } = await mlTest(
		'<template><button type="buttonType"></button></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	const { violations: violations2 } = await mlTest(
		'<template><button :type="buttonType"></button></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(violations1.length).toBe(1);
	expect(violations2.length).toBe(0);
});

test('Vue iterator', async () => {
	const { violations: violations1 } = await mlTest(
		'<template><ul ref="ul"><li key="key"></li></ul></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			specs: ['@markuplint/vue-spec'],
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);
	const { violations: violations2 } = await mlTest(
		'<template><ul><li v-for="item of list" :key="key"></li></ul></template>',
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(violations1.length).toBe(1);
	expect(violations2.length).toBe(0);
});

test('React Component', async () => {
	const { violations } = await mlTest(
		'<Component className="foo" tabIndex="-1" tabindex="-1" aria-label="accname" htmlFor="bar" />',
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(violations).toStrictEqual([]);
});

test('React HTML', async () => {
	const { violations } = await mlTest(
		'<img className="foo" tabIndex="-1" tabindex="-1" aria-label="accname" htmlFor="bar" />',
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(violations).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 36,
			message: 'The "tabindex" attribute is not allowed. Did you mean "tabIndex"?',
			raw: 'tabindex',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 71,
			message: 'The "for" attribute is not allowed',
			raw: 'htmlFor',
		},
	]);
});

test('React', async () => {
	const { violations } = await mlTest(
		'<a href={href} target={target} invalidAttr={invalidAttr} />',
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(violations).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 32,
			message: 'The "invalidAttr" attribute is not allowed',
			raw: 'invalidAttr',
		},
	]);
});

test('React with spread attribute', async () => {
	expect(
		(
			await mlTest(
				'<a target="_blank" />',
				{
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					rules: {
						'invalid-attr': true,
					},
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 4,
			message: 'The "target" attribute is not allowed',
			raw: 'target',
		},
	]);

	expect(
		(
			await mlTest(
				'<a {...props} target="_blank" />',
				{
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					rules: {
						'invalid-attr': true,
					},
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([]);

	expect(
		(
			await mlTest(
				'<img invalid />',
				{
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					rules: {
						'invalid-attr': true,
					},
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "invalid" attribute is not allowed',
			raw: 'invalid',
		},
	]);

	expect(
		(
			await mlTest(
				'<img {...props} invalid />',
				{
					parser: {
						'.*': '@markuplint/jsx-parser',
					},
					rules: {
						'invalid-attr': true,
					},
				},
				[rule],
				'en',
			)
		).violations,
	).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 1,
			col: 17,
			message: 'The "invalid" attribute is not allowed',
			raw: 'invalid',
		},
	]);
});

test('React spec', async () => {
	const jsx = `<>
	<div value defaultValue></div>
	<input defaultChecked />
	<input type="checkbox" defaultChecked />
	<select value defaultValue></select>
	<textarea value defaultValue></textarea>
	<select value={0} defaultValue={0}></select>
	<textarea value={0} defaultValue={0}></textarea>
</>`;
	const { violations: violations1 } = await mlTest(
		jsx,
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	const { violations: violations2 } = await mlTest(
		jsx,
		{
			parser: {
				'.*': '@markuplint/jsx-parser',
			},
			specs: ['@markuplint/react-spec'],
			rules: {
				'invalid-attr': true,
			},
		},
		[rule],
		'en',
	);

	expect(violations1).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 2,
			col: 7,
			message: 'The "value" attribute is not allowed',
			raw: 'value',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 2,
			col: 13,
			message: 'The "defaultValue" attribute is not allowed',
			raw: 'defaultValue',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 3,
			col: 9,
			message: 'The "defaultChecked" attribute is not allowed',
			raw: 'defaultChecked',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 4,
			col: 25,
			message: 'The "defaultChecked" attribute is not allowed',
			raw: 'defaultChecked',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 5,
			col: 10,
			message: 'The "value" attribute is not allowed',
			raw: 'value',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 5,
			col: 16,
			message: 'The "defaultValue" attribute is not allowed',
			raw: 'defaultValue',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 6,
			col: 12,
			message: 'The "value" attribute is not allowed',
			raw: 'value',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 6,
			col: 18,
			message: 'The "defaultValue" attribute is not allowed',
			raw: 'defaultValue',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 7,
			col: 10,
			message: 'The "value" attribute is not allowed',
			raw: 'value',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 7,
			col: 20,
			message: 'The "defaultValue" attribute is not allowed',
			raw: 'defaultValue',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 8,
			col: 12,
			message: 'The "value" attribute is not allowed',
			raw: 'value',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 8,
			col: 22,
			message: 'The "defaultValue" attribute is not allowed',
			raw: 'defaultValue',
		},
	]);

	expect(violations2).toStrictEqual([
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 2,
			col: 7,
			message: 'The "value" attribute is not allowed',
			raw: 'value',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 2,
			col: 13,
			message: 'The "defaultValue" attribute is not allowed',
			raw: 'defaultValue',
		},
		{
			ruleId: 'invalid-attr',
			severity: 'error',
			line: 3,
			col: 9,
			message: 'The "defaultChecked" attribute is not allowed',
			raw: 'defaultChecked',
		},
	]);
});
