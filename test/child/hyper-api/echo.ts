/* eslint-disable jsdoc/require-jsdoc */

import type {
	HyperAPIResponse,
	HyperAPIRequest,
} from '@hyperapi/core';

export default function (request: HyperAPIRequest<{ name: string }>): HyperAPIResponse {
	return {
		from: 'child',
		message: `Hello, ${request.args.name}!`,
	};
}
