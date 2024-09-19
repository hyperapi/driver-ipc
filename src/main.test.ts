import { HyperAPI } from '@hyperapi/core';
import { fork } from 'node:child_process';
import {
	expect,
	test,
} from 'vitest';
import {
	HyperAPIIpcDriver,
	sendIpcRequest,
} from './main.js';

const IS_BUN = typeof Bun !== 'undefined';

const child_process = fork(
	new URL(
		`../test/child/main.${IS_BUN ? 'ts' : 'js'}`,
		import.meta.url,
	).pathname,
	{
		stdio: [
			'ignore',
			'pipe',
			'pipe',
			'ipc',
		],
	},
);

const driver = new HyperAPIIpcDriver(child_process);
const _hyperApi = new HyperAPI({
	root: new URL('../test/parent/hyper-api', import.meta.url).pathname,
	driver,
});

test('child reply', async () => {
	const result = await sendIpcRequest(
		child_process,
		'echo',
		{
			name: 'Kirick',
		},
	);

	expect(result).toStrictEqual([
		true,
		{
			from: 'child',
			message: 'Hello, Kirick!',
		},
	]);
});

test('child asks parent', async () => {
	const result = await sendIpcRequest(
		child_process,
		'proxy',
		{
			name: 'Kirick',
		},
	);

	expect(result).toStrictEqual([
		true,
		{
			is_success: true,
			data: {
				from: 'parent',
				message: 'Hello, Kirick!',
			},
		},
	]);
});
