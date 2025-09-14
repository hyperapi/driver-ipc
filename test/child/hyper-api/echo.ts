import * as v from 'valibot';
import { valibot } from '../../valibot.js';
import { hyperApi } from '../main.js';

export default hyperApi
	.module()
	.use(valibot(v.object({ name: v.string() })))
	.action((request) => {
		return {
			from: 'child',
			message: `Hello, ${request.args.name}!`,
		};
	});
