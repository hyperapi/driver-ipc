"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// dist/esm/main.js
var main_exports = {};
__export(main_exports, {
  HyperAPIIpcDriver: () => HyperAPIIpcDriver,
  sendIpcRequest: () => sendIpcRequest
});
module.exports = __toCommonJS(main_exports);
var import_core = require("@hyperapi/core");
var import_node_crypto = require("node:crypto");
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function createId() {
  return (0, import_node_crypto.randomBytes)(16).toString("base64").replaceAll("=", "");
}
var HyperAPIIpcDriver = class {
  process;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hyperapi_handler = void 0;
  constructor(process = globalThis.process) {
    this.process = process;
  }
  /**
   * Starts the server.
   * @param hyperapi_handler - The handler to use.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  start(hyperapi_handler) {
    this.hyperapi_handler = hyperapi_handler;
    this.process.on("message", async (message) => {
      if (!isRecord(message)) {
        return;
      }
      const request = message["@hyperapi-request"];
      if (request === void 0) {
        return;
      }
      if (!Array.isArray(request)) {
        throw new TypeError("Invalid request.");
      }
      if (typeof request[0] !== "string") {
        throw new TypeError("Invalid request[0].");
      }
      if (typeof request[1] !== "string") {
        throw new TypeError("Invalid request[1].");
      }
      if (!(request[2] === void 0 || isRecord(request[2]))) {
        throw new TypeError("Invalid request[2].");
      }
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
        if (error instanceof import_core.HyperAPIError) {
          response[2] = error.getResponse();
        } else {
          console.error("Unhandled error in @hyperapi/driver-tasq:");
          console.error(error);
          response[2] = new import_core.HyperAPIInternalError().getResponse();
        }
      }
      this.process.send({
        "@hyperapi-response": response
      });
    });
  }
  /**
   * Stops the server.
   */
  stop() {
    this.process.removeAllListeners("message");
  }
  /**
   * Handles the request.
   * @param path - API method path.
   * @param args - API method arguments.
   * @returns -
   */
  async processRequest(path, args) {
    if (!this.hyperapi_handler) {
      throw new Error("No handler available.");
    }
    const hyperapi_response = await this.hyperapi_handler({
      method: "UNKNOWN",
      path,
      args
    });
    if (hyperapi_response instanceof import_core.HyperAPIError) {
      throw hyperapi_response;
    }
    return hyperapi_response;
  }
};
function sendIpcRequest(process, path, args) {
  const id = createId();
  const promise = new Promise((resolve) => {
    process.on("message", (message) => {
      if (!isRecord(message)) {
        return;
      }
      const response = message["@hyperapi-response"];
      if (response === void 0) {
        return;
      }
      if (!Array.isArray(response) || response.length !== 3) {
        throw new TypeError("Invalid response.");
      }
      if (typeof response[0] !== "string") {
        throw new TypeError("Invalid response[0] (id).");
      }
      if (response[0] !== id) {
        return;
      }
      if (typeof response[1] !== "boolean") {
        throw new TypeError("Invalid response[1] (is_success).");
      }
      resolve([
        response[1],
        response[2]
      ]);
    });
  });
  process.send({
    "@hyperapi-request": [
      id,
      path,
      args
    ]
  });
  return promise;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HyperAPIIpcDriver,
  sendIpcRequest
});
