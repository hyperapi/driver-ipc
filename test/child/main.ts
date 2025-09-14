import { HyperAPI } from '@hyperapi/core';
import { HyperAPIIpcDriver } from '../../src/main.js';

const driver = new HyperAPIIpcDriver(process);
export const hyperApi = new HyperAPI(
	driver,
	new URL('hyper-api', import.meta.url).pathname,
);
