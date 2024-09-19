/* eslint-disable jsdoc/require-jsdoc */

import { sendIpcRequest } from '../../../src/main.js';
import type {
	HyperAPIResponse,
	HyperAPIRequest,
} from '@hyperapi/core';

export default async function (request: HyperAPIRequest<{ name: string }>): Promise<HyperAPIResponse> {
	const [
		is_success,
		data,
	] = await sendIpcRequest(
		process,
		'echo',
		request.args,
	);

	return {
		is_success,
		data,
	};
}
