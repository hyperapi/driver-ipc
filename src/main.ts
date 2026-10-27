import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
	HyperAPIError,
	HyperAPIInternalError,
	HyperAPIInvalidParametersError,
} from '@hyperapi/core';
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

	// A peer can send anything, and the emitter drops the promise this returns:
	// uncaught, one bad message is an unhandled rejection that takes the whole
	// process down.
	#handler = async (message: unknown) => {
		try {
			await this.#onMessage(message);
		} catch (error) {
			// oxlint-disable-next-line no-console
			console.error('Unhandled error in @hyperapi/driver-ipc:');
			// oxlint-disable-next-line no-console
			console.error(error);
		}
	};

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

		const [request_id, path, args] = request as unknown[];

		// Without a usable id there is nobody to answer, so the only thing left
		// is to report it.
		if (typeof request_id !== 'string') {
			throw new TypeError('Invalid request[0].');
		}

		const response: [string, boolean, unknown] = [request_id, true, undefined];

		if (typeof path !== 'string' || !(args === undefined || isRecord(args))) {
			response[1] = false;
			response[2] = new HyperAPIInvalidParametersError().getResponse();
		} else {
			try {
				response[2] = await this.processRequest(path, args);
			} catch (error) {
				response[1] = false;

				if (error instanceof HyperAPIError) {
					response[2] = error.getResponse();
				} else {
					// oxlint-disable-next-line no-console
					console.error('Unhandled error in @hyperapi/driver-ipc:');
					// oxlint-disable-next-line no-console
					console.error(error);

					response[2] = new HyperAPIInternalError().getResponse();
				}
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

		return response;
	}

	/** Stops the server. */
	override destroy(): void {
		this.process.off('message', this.#handler);
		super.destroy();
	}
}

/** How long {@link sendIpcRequest} waits for a response. */
const DEFAULT_TIMEOUT = 30_000;

/**
 * Sends a request to the process.
 * @param process - The process to send the request to.
 * @param path - The API method path.
 * @param args - The API method arguments.
 * @param options -
 * @param options.timeout - Milliseconds to wait for a response before rejecting. Default: 30000.
 * @returns -
 */
export function sendIpcRequest(
	process: NodeJS.Process | ChildProcess,
	path: string,
	args?: Record<string, unknown>,
	{ timeout = DEFAULT_TIMEOUT }: { timeout?: number } = {},
): Promise<[boolean, unknown]> {
	const id = randomUUID();

	return new Promise<[boolean, unknown]>((resolve, reject) => {
		// eslint-disable-next-line jsdoc/require-jsdoc
		function stop() {
			clearTimeout(timer);
			process.off('message', handler);
		}

		// eslint-disable-next-line jsdoc/require-jsdoc
		function handler(message: unknown) {
			if (!isRecord(message)) {
				return;
			}

			const response = message['@hyperapi-response'];

			// Anything not attributable to this request is ignored rather than
			// thrown: this runs as an event listener, where a throw is fatal.
			if (!Array.isArray(response) || response[0] !== id) {
				return;
			}

			stop();

			if (response.length !== 3 || typeof response[1] !== 'boolean') {
				reject(new TypeError('Invalid response.'));
				return;
			}

			resolve([response[1], response[2]]);
		}

		// Every exit settles the promise and detaches the listener: a request
		// that is never answered would otherwise hang its caller forever.
		const timer = setTimeout(() => {
			stop();
			reject(new Error(`IPC request "${path}" timed out after ${timeout}ms.`));
		}, timeout);

		process.on('message', handler);

		if (typeof process.send !== 'function') {
			stop();
			reject(new Error('Process was not started with an IPC channel.'));
			return;
		}

		process.send(
			{ '@hyperapi-request': [id, path, args] },
			(error: Error | null) => {
				if (error !== null) {
					stop();
					reject(error);
				}
			},
		);
	});
}
