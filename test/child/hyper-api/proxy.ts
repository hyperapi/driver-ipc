/* eslint-disable jsdoc/require-jsdoc */

import type { HyperAPIRequest, HyperAPIResponse } from '@hyperapi/core';
import { sendIpcRequest } from '../../../src/main.js';

export default async function (
	request: HyperAPIRequest<{ name: string }>,
): Promise<HyperAPIResponse> {
	const [is_success, data] = await sendIpcRequest(
		process,
		'echo',
		request.args,
	);

	return {
		is_success,
		data,
	};
}
