import * as v from 'valibot';
import { hyperApi } from '../../setup.js';
import { valibot } from '../../valibot.js';

export default hyperApi
	.module()
	.use(valibot(v.object({ name: v.string() })))
	.action((request) => {
		return {
			from: 'parent',
			message: `Hello, ${request.args.name}!`,
		};
	});
