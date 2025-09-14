import { fork } from 'node:child_process';
import { HyperAPI } from '@hyperapi/core';
import { HyperAPIIpcDriver } from '../src/main.js';

const IS_BUN = typeof Bun !== 'undefined';

const child_process = fork(
	new URL(`child/main.${IS_BUN ? 'ts' : 'js'}`, import.meta.url).pathname,
	{
		stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
	},
);

export const hyperApi = new HyperAPI(
	new HyperAPIIpcDriver(child_process),
	new URL('parent/hyper-api', import.meta.url).pathname,
);
