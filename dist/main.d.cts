import { ChildProcess } from "node:child_process";
import { HyperAPIDriver, HyperAPIRequest } from "@hyperapi/core/dev";

//#region src/main.d.ts
declare class HyperAPIIpcDriver extends HyperAPIDriver<HyperAPIRequest> {
  #private;
  readonly process: NodeJS.Process | ChildProcess;
  constructor(process?: NodeJS.Process | ChildProcess);
  /** Handles the request. */
  private processRequest;
  /** Stops the server. */
  override destroy(): void;
}
/**
* Sends a request to the process.
* @param process - The process to send the request to.
* @param path - The API method path.
* @param args - The API method arguments.
* @param options -
* @param options.timeout - Milliseconds to wait for a response before rejecting. Default: 30000.
* @returns -
*/
declare function sendIpcRequest(process: NodeJS.Process | ChildProcess, path: string, args?: Record<string, unknown>, {
  timeout
}?: {
  timeout?: number;
}): Promise<[boolean, unknown]>;
//#endregion
export { HyperAPIIpcDriver, sendIpcRequest };