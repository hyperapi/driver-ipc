import { HyperAPIInvalidParametersError } from '@hyperapi/core';
import type { HyperAPIRequest } from '@hyperapi/core/dev';
import * as v from 'valibot';

type ValiBaseSchema = Parameters<typeof v.parser>[0];

/**
 * Valibot validator for HyperAPI requests.
 * @param schema - The Valibot schema to validate the request against.
 * @returns A middleware function that validates the request arguments using the provided schema.
 */
export function valibot<S extends ValiBaseSchema>(schema: S) {
	return (request: HyperAPIRequest) => {
		const result = v.safeParse(schema, request.args);
		if (result.success) {
			return { args: result.output };
		}

		throw new HyperAPIInvalidParametersError();
	};
}
