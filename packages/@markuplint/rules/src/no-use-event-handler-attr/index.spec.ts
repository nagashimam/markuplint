import { mlRuleTest } from 'markuplint';

import rule from './';

it('disallows onclick', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="e => e"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'onclick="e => e"',
			message: 'The "onclick" attribute is disallowed',
		},
	]);
});

it('allows onclick because ignores it', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="e => e"></div>', {
		rule: {
			option: {
				ignore: 'onclick',
			},
		},
	});
	expect(violations).toStrictEqual([]);
});

it('✔ onclick, ✘ onmouseleave', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="e => e" onmouseleave="e => e"></div>', {
		rule: {
			option: {
				ignore: 'onclick',
			},
		},
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 23,
			raw: 'onmouseleave="e => e"',
			message: 'The "onmouseleave" attribute is disallowed',
		},
	]);
});

it('ignore by regex', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="e => e"></div>', {
		rule: {
			option: {
				ignore: '/^onc/',
			},
		},
	});
	expect(violations).toStrictEqual([]);
});
