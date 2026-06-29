import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { HyperAPIError, HyperAPIInternalError } from '@hyperapi/core';
import {
	HyperAPIDriver,
	type HyperAPIRequest,
	isRecord,
} from '@hyperapi/core/dev';

export class HyperAPIIpcDriver extends HyperAPIDriver<HyperAPIRequest> {
	readonly process: NodeJS.Process | ChildProcess;

	constructor(process: NodeJS.Process | ChildProcess = globalThis.process) {
		super();

		this.process = process;

		this.process.on('message', this.#handler);
	}

	#handler = (message: unknown) => this.#onMessage(message);

	async #onMessage(message: unknown) {
		if (!isRecord(message)) {
			return;
		}

		const request = message['@hyperapi-request'];
		if (request === undefined) {
			return;
		}

		if (!Array.isArray(request)) {
			throw new TypeError('Invalid request.');
		}

		if (typeof request[0] !== 'string') {
			throw new TypeError('Invalid request[0].');
		}

		if (typeof request[1] !== 'string') {
			throw new TypeError('Invalid request[1].');
		}

		if (!(request[2] === undefined || isRecord(request[2]))) {
			throw new TypeError('Invalid request[2].');
		}

		const [request_id, path, args] = request;

		const response: [string, boolean, unknown] = [request_id, true, undefined];

		try {
			response[2] = await this.processRequest(path, args);
		} catch (error) {
			response[1] = false;

			if (error instanceof HyperAPIError) {
				response[2] = error.getResponse();
			} else {
				// oxlint-disable-next-line no-console
				console.error('Unhandled error in @hyperapi/driver-tasq:');
				// oxlint-disable-next-line no-console
				console.error(error);

				response[2] = new HyperAPIInternalError().getResponse();
			}
		}

		this.process.send!({
			'@hyperapi-response': response,
		});
	}

	/** Handles the request. */
	private async processRequest(
		path: string,
		args?: Record<string, unknown>,
	): Promise<unknown> {
		const response = await this.fetch({
			method: 'UNDEF',
			path,
			args: args ?? {},
		});

		if (response instanceof HyperAPIError) {
			throw response;
		}

		if (response instanceof Response) {
			throw new TypeError('Response is not supported in this driver');
		}

		return response;
	}

	/** Stops the server. */
	override destroy(): void {
		this.process.off('message', this.#handler);
		super.destroy();
	}
}

/**
 * Sends a request to the process.
 * @param process - The process to send the request to.
 * @param path - The API method path.
 * @param args - The API method arguments.
 * @returns -
 */
export function sendIpcRequest(
	process: NodeJS.Process | ChildProcess,
	path: string,
	args?: Record<string, unknown>,
): Promise<[boolean, unknown]> {
	const id = randomUUID();

	const promise = new Promise<[boolean, unknown]>((resolve) => {
		// eslint-disable-next-line jsdoc/require-jsdoc
		function handler(message: unknown) {
			if (!isRecord(message)) {
				return;
			}

			const response = message['@hyperapi-response'];
			if (response === undefined) {
				return;
			}

			if (!Array.isArray(response) || response.length !== 3) {
				throw new TypeError('Invalid response.');
			}

			if (typeof response[0] !== 'string') {
				throw new TypeError('Invalid response[0] (id).');
			}

			if (response[0] !== id) {
				return;
			}

			if (typeof response[1] !== 'boolean') {
				throw new TypeError('Invalid response[1] (is_success).');
			}

			resolve([response[1], response[2]]);
			process.off('message', handler);
		}

		process.on('message', handler);
	});

	process.send!({
		'@hyperapi-request': [id, path, args],
	});

	return promise;
}
