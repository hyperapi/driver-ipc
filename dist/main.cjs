var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// dist/esm/main.js
var exports_main = {};
__export(exports_main, {
  sendIpcRequest: () => sendIpcRequest,
  HyperAPIIpcDriver: () => HyperAPIIpcDriver
});
module.exports = __toCommonJS(exports_main);
var import_core = require("@hyperapi/core");
var import_node_crypto = require("node:crypto");
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function createId() {
  return import_node_crypto.randomBytes(16).toString("base64").replaceAll("=", "");
}

class HyperAPIIpcDriver {
  process;
  hyperapi_handler = undefined;
  constructor(process = globalThis.process) {
    this.process = process;
  }
  start(hyperapi_handler) {
    this.hyperapi_handler = hyperapi_handler;
    this.process.on("message", async (message) => {
      if (!isRecord(message)) {
        return;
      }
      const request = message["@hyperapi-request"];
      if (request === undefined) {
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
      if (!(request[2] === undefined || isRecord(request[2]))) {
        throw new TypeError("Invalid request[2].");
      }
      const [request_id, path, args] = request;
      const response = [
        request_id,
        true,
        undefined
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
  stop() {
    this.process.removeAllListeners("message");
  }
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
    if (hyperapi_response instanceof Response) {
      throw new TypeError("Response is not supported in this driver");
    }
    return hyperapi_response;
  }
}
function sendIpcRequest(process, path, args) {
  const id = createId();
  const promise = new Promise((resolve) => {
    process.on("message", (message) => {
      if (!isRecord(message)) {
        return;
      }
      const response = message["@hyperapi-response"];
      if (response === undefined) {
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
