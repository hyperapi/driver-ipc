import { HyperAPI } from '@hyperapi/core';
import { HyperAPIIpcDriver } from '../../src/main.js';

const driver = new HyperAPIIpcDriver(process);
const _hyperApi = new HyperAPI({
	root: new URL('hyper-api', import.meta.url).pathname,
	driver,
});
