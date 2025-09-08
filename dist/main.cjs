//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let node_crypto = require("node:crypto");
node_crypto = __toESM(node_crypto);
let __hyperapi_core = require("@hyperapi/core");
__hyperapi_core = __toESM(__hyperapi_core);

//#region src/main.ts
/**
* Checks if the value is a record.
* @param value - The value to check.
* @returns -
*/
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Creates random ID.
* @returns -
*/
function createId() {
	return (0, node_crypto.randomBytes)(16).toString("base64").replaceAll("=", "");
}
var HyperAPIIpcDriver = class {
	process;
	hyperapi_handler = void 0;
	constructor(process = globalThis.process) {
		this.process = process;
	}
	/**
	* Starts the server.
	* @param hyperapi_handler - The handler to use.
	*/
	start(hyperapi_handler) {
		this.hyperapi_handler = hyperapi_handler;
		this.process.on("message", async (message) => {
			if (!isRecord(message)) return;
			const request = message["@hyperapi-request"];
			if (request === void 0) return;
			if (!Array.isArray(request)) throw new TypeError("Invalid request.");
			if (typeof request[0] !== "string") throw new TypeError("Invalid request[0].");
			if (typeof request[1] !== "string") throw new TypeError("Invalid request[1].");
			if (!(request[2] === void 0 || isRecord(request[2]))) throw new TypeError("Invalid request[2].");
			const [request_id, path, args] = request;
			const response = [
				request_id,
				true,
				void 0
			];
			try {
				response[2] = await this.processRequest(path, args);
			} catch (error) {
				response[1] = false;
				if (error instanceof __hyperapi_core.HyperAPIError) response[2] = error.getResponse();
				else {
					console.error("Unhandled error in @hyperapi/driver-tasq:");
					console.error(error);
					response[2] = new __hyperapi_core.HyperAPIInternalError().getResponse();
				}
			}
			this.process.send({ "@hyperapi-response": response });
		});
	}
	/**
	* Stops the server.
	*/
	stop() {}
	/**
	* Handles the request.
	* @param path - API method path.
	* @param args - API method arguments.
	* @returns -
	*/
	async processRequest(path, args) {
		if (!this.hyperapi_handler) throw new Error("No handler available.");
		const hyperapi_response = await this.hyperapi_handler({
			method: "UNKNOWN",
			path,
			args
		});
		if (hyperapi_response instanceof __hyperapi_core.HyperAPIError) throw hyperapi_response;
		if (hyperapi_response instanceof Response) throw new TypeError("Response is not supported in this driver");
		return hyperapi_response;
	}
};
/**
* Sends a request to the process.
* @param process - The process to send the request to.
* @param path - The API method path.
* @param args - The API method arguments.
* @returns -
*/
function sendIpcRequest(process, path, args) {
	const id = createId();
	const promise = new Promise((resolve) => {
		process.on("message", (message) => {
			if (!isRecord(message)) return;
			const response = message["@hyperapi-response"];
			if (response === void 0) return;
			if (!Array.isArray(response) || response.length !== 3) throw new TypeError("Invalid response.");
			if (typeof response[0] !== "string") throw new TypeError("Invalid response[0] (id).");
			if (response[0] !== id) return;
			if (typeof response[1] !== "boolean") throw new TypeError("Invalid response[1] (is_success).");
			resolve([response[1], response[2]]);
		});
	});
	process.send({ "@hyperapi-request": [
		id,
		path,
		args
	] });
	return promise;
}

//#endregion
exports.HyperAPIIpcDriver = HyperAPIIpcDriver;
exports.sendIpcRequest = sendIpcRequest;