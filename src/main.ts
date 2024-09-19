import {
	HyperAPIError,
	HyperAPIInternalError,
	type HyperAPIDriver,
	type HyperAPIDriverHandler,
	type HyperAPIRequest,
} from '@hyperapi/core';
import type {
	ChildProcess,
} from 'node:child_process';
import { randomBytes } from 'node:crypto';

/**
 * Checks if the value is a record.
 * @param value - The value to check.
 * @returns -
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object'
		&& value !== null
		&& !Array.isArray(value);
}

/**
 * Creates random ID.
 * @returns -
 */
function createId() {
	return randomBytes(16)
		.toString('base64')
		.replaceAll('=', '');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class HyperAPIIpcDriver implements HyperAPIDriver<HyperAPIRequest<any>> {
	readonly process: NodeJS.Process | ChildProcess;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private hyperapi_handler?: HyperAPIDriverHandler<HyperAPIRequest<any>> = undefined;

	constructor(process: NodeJS.Process | ChildProcess = globalThis.process) {
		this.process = process;
	}

	/**
	 * Starts the server.
	 * @param hyperapi_handler - The handler to use.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	start(hyperapi_handler: HyperAPIDriverHandler<HyperAPIRequest<any>>) {
		this.hyperapi_handler = hyperapi_handler;
		this.process.on(
			'message',
			async (message) => {
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

				if (
					!(
						request[2] === undefined
						|| isRecord(request[2])
					)
				) {
					throw new TypeError('Invalid request[2].');
				}

				const [
					request_id,
					path,
					args,
				] = request;

				const response: [
					string,
					boolean,
					unknown,
				] = [
					request_id,
					true,
					undefined,
				];

				try {
					response[2] = await this.processRequest(path, args);
				}
				catch (error) {
					response[1] = false;

					if (error instanceof HyperAPIError) {
						response[2] = error.getResponse();
					}
					else {
						// eslint-disable-next-line no-console
						console.error('Unhandled error in @hyperapi/driver-tasq:');
						// eslint-disable-next-line no-console
						console.error(error);

						response[2] = new HyperAPIInternalError().getResponse();
					}
				}

				this.process.send!({
					'@hyperapi-response': response,
				});
			},
		);
	}

	/**
	 * Stops the server.
	 */
	stop() {
		this.process.removeAllListeners('message');
	}

	/**
	 * Handles the request.
	 * @param path - API method path.
	 * @param args - API method arguments.
	 * @returns -
	 */
	private async processRequest(
		path: string,
		args?: Record<string, unknown>,
	): Promise<unknown> {
		if (!this.hyperapi_handler) {
			throw new Error('No handler available.');
		}

		const hyperapi_response = await this.hyperapi_handler({
			method: 'UNKNOWN',
			path,
			args,
		});

		if (hyperapi_response instanceof HyperAPIError) {
			throw hyperapi_response;
		}

		return hyperapi_response;
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
): Promise<[ boolean, unknown ]> {
	const id = createId();

	const promise = new Promise<[ boolean, unknown ]>((resolve) => {
		process.on(
			'message',
			(message) => {
				if (!isRecord(message)) {
					return;
				}

				const response = message['@hyperapi-response'];
				if (response === undefined) {
					return;
				}

				if (
					!Array.isArray(response)
					|| response.length !== 3
				) {
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

				resolve([
					response[1],
					response[2],
				]);
			},
		);
	});

	process.send!({
		'@hyperapi-request': [
			id,
			path,
			args,
		],
	});

	return promise;
}
