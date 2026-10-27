import { fork } from 'node:child_process';
import { HyperAPI } from '@hyperapi/core';
import { expect, test } from 'vitest';
import { HyperAPIIpcDriver, sendIpcRequest } from './main.js';

const IS_BUN = typeof Bun !== 'undefined';

const child_process = fork(
	new URL(`../test/child/main.${IS_BUN ? 'ts' : 'js'}`, import.meta.url)
		.pathname,
	{
		stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
	},
);

const driver = new HyperAPIIpcDriver(child_process);
export const hyperApi = new HyperAPI(
	driver,
	new URL('../test/parent/hyper-api', import.meta.url).pathname,
);

test('child reply', async () => {
	const result = await sendIpcRequest(child_process, 'echo', {
		name: 'Kirick',
	});

	expect(result).toStrictEqual([
		true,
		{
			from: 'child',
			message: 'Hello, Kirick!',
		},
	]);
});

test('child asks parent', async () => {
	const result = await sendIpcRequest(child_process, 'proxy', {
		name: 'Kirick',
	});

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

test('malformed request does not kill the peer', async () => {
	// Nothing to answer here: no usable request id. This used to reach the
	// emitter as an unhandled rejection and take the child down.
	child_process.send({ '@hyperapi-request': 'not-an-array' });

	const result = await sendIpcRequest(child_process, 'echo', {
		name: 'Kirick',
	});

	expect(result).toStrictEqual([
		true,
		{
			from: 'child',
			message: 'Hello, Kirick!',
		},
	]);
});

test('malformed request with a usable id is answered', async () => {
	const result = await sendIpcRequest(
		child_process,
		42 as unknown as string,
		{},
	);

	expect(result).toStrictEqual([
		false,
		{
			code: 2,
			description: 'One of the parameters specified was missing or invalid',
		},
	]);
});

test('sendIpcRequest rejects when nothing answers', async () => {
	// A peer that accepts the message and never answers.
	const listeners = new Set<unknown>();
	const silent = {
		on: (_event: string, handler: unknown) => listeners.add(handler),
		off: (_event: string, handler: unknown) => listeners.delete(handler),
		send: (_message: unknown, callback: (error: Error | null) => void) => {
			callback(null);
			return true;
		},
	} as unknown as NodeJS.Process;

	await expect(
		sendIpcRequest(silent, 'echo', { name: 'Kirick' }, { timeout: 50 }),
	).rejects.toThrow('timed out');

	// The listener must go with it, or every lost request leaks one.
	expect(listeners.size).toBe(0);
});
