import { HyperAPIInvalidParametersError } from '@hyperapi/core';
import type { HyperAPIRequest } from '@hyperapi/core/dev';
import * as v from 'valibot';

// eslint-disable-next-line jsdoc/require-jsdoc, @typescript-eslint/no-explicit-any
export function valibot<S extends v.BaseSchema<any, any, any>>(schema: S) {
	return (request: HyperAPIRequest) => {
		const result = v.safeParse(schema, request.args);
		if (result.success) {
			return { args: result.output };
		}

		throw new HyperAPIInvalidParametersError();
	};
}
