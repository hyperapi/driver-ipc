import { randomBytes } from "node:crypto";
import { HyperAPIError, HyperAPIInternalError } from "@hyperapi/core";
import { HyperAPIDriver, isRecord } from "@hyperapi/core/dev";

//#region src/main.ts
/**
* Creates random ID.
* @returns -
*/
function createId() {
	return randomBytes(16).toString("base64").replaceAll("=", "");
}
var HyperAPIIpcDriver = class extends HyperAPIDriver {
	process;
	constructor(process = globalThis.process) {
		super();
		this.process = process;
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
				if (error instanceof HyperAPIError) response[2] = error.getResponse();
				else {
					console.error("Unhandled error in @hyperapi/driver-tasq:");
					console.error(error);
					response[2] = new HyperAPIInternalError().getResponse();
				}
			}
			this.process.send({ "@hyperapi-response": response });
		});
	}
	/**
	* Handles the request.
	* @param path - API method path.
	* @param args - API method arguments.
	* @returns -
	*/
	async processRequest(path, args) {
		const response = await this.emitRequest({
			method: "UNDEF",
			path,
			args: args ?? {}
		});
		if (response instanceof HyperAPIError) throw response;
		if (response instanceof Response) throw new TypeError("Response is not supported in this driver");
		return response;
	}
	/**
	* Stops the server.
	*/
	destroy() {
		super.destroy();
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
export { HyperAPIIpcDriver, sendIpcRequest };