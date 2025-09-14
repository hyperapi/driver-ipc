import * as v from 'valibot';
import { sendIpcRequest } from '../../../src/main.js';
import { valibot } from '../../valibot.js';
import { hyperApi } from '../main.js';

export default hyperApi
	.module()
	.use(valibot(v.object({ name: v.string() })))
	.action(async (request) => {
		const [is_success, data] = await sendIpcRequest(
			process,
			'echo',
			request.args,
		);

		return {
			is_success,
			data,
		};
	});
