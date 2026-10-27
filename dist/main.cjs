Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let node_crypto = require("node:crypto");
let _hyperapi_core = require("@hyperapi/core");
let _hyperapi_core_dev = require("@hyperapi/core/dev");
//#region src/main.ts
var HyperAPIIpcDriver = class extends _hyperapi_core_dev.HyperAPIDriver {
	process;
	constructor(process = globalThis.process) {
		super();
		this.process = process;
		this.process.on("message", this.#handler);
	}
	#handler = async (message) => {
		try {
			await this.#onMessage(message);
		} catch (error) {
			console.error("Unhandled error in @hyperapi/driver-ipc:");
			console.error(error);
		}
	};
	async #onMessage(message) {
		if (!(0, _hyperapi_core_dev.isRecord)(message)) return;
		const request = message["@hyperapi-request"];
		if (request === void 0) return;
		if (!Array.isArray(request)) throw new TypeError("Invalid request.");
		const [request_id, path, args] = request;
		if (typeof request_id !== "string") throw new TypeError("Invalid request[0].");
		const response = [
			request_id,
			true,
			void 0
		];
		if (typeof path !== "string" || !(args === void 0 || (0, _hyperapi_core_dev.isRecord)(args))) {
			response[1] = false;
			response[2] = new _hyperapi_core.HyperAPIInvalidParametersError().getResponse();
		} else try {
			response[2] = await this.processRequest(path, args);
		} catch (error) {
			response[1] = false;
			if (error instanceof _hyperapi_core.HyperAPIError) response[2] = error.getResponse();
			else {
				console.error("Unhandled error in @hyperapi/driver-ipc:");
				console.error(error);
				response[2] = new _hyperapi_core.HyperAPIInternalError().getResponse();
			}
		}
		this.process.send({ "@hyperapi-response": response });
	}
	/** Handles the request. */
	async processRequest(path, args) {
		const response = await this.fetch({
			method: "UNDEF",
			path,
			args: args ?? {}
		});
		if (response instanceof _hyperapi_core.HyperAPIError) throw response;
		return response;
	}
	/** Stops the server. */
	destroy() {
		this.process.off("message", this.#handler);
		super.destroy();
	}
};
/** How long {@link sendIpcRequest} waits for a response. */
const DEFAULT_TIMEOUT = 3e4;
/**
* Sends a request to the process.
* @param process - The process to send the request to.
* @param path - The API method path.
* @param args - The API method arguments.
* @param options -
* @param options.timeout - Milliseconds to wait for a response before rejecting. Default: 30000.
* @returns -
*/
function sendIpcRequest(process, path, args, { timeout = DEFAULT_TIMEOUT } = {}) {
	const id = (0, node_crypto.randomUUID)();
	return new Promise((resolve, reject) => {
		function stop() {
			clearTimeout(timer);
			process.off("message", handler);
		}
		function handler(message) {
			if (!(0, _hyperapi_core_dev.isRecord)(message)) return;
			const response = message["@hyperapi-response"];
			if (!Array.isArray(response) || response[0] !== id) return;
			stop();
			if (response.length !== 3 || typeof response[1] !== "boolean") {
				reject(/* @__PURE__ */ new TypeError("Invalid response."));
				return;
			}
			resolve([response[1], response[2]]);
		}
		const timer = setTimeout(() => {
			stop();
			reject(/* @__PURE__ */ new Error(`IPC request "${path}" timed out after ${timeout}ms.`));
		}, timeout);
		process.on("message", handler);
		if (typeof process.send !== "function") {
			stop();
			reject(/* @__PURE__ */ new Error("Process was not started with an IPC channel."));
			return;
		}
		process.send({ "@hyperapi-request": [
			id,
			path,
			args
		] }, (error) => {
			if (error !== null) {
				stop();
				reject(error);
			}
		});
	});
}
//#endregion
exports.HyperAPIIpcDriver = HyperAPIIpcDriver;
exports.sendIpcRequest = sendIpcRequest;
