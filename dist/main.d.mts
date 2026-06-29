import { HyperAPIDriver, HyperAPIRequest } from "@hyperapi/core/dev";
import { ChildProcess } from "node:child_process";

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
* @returns -
*/
declare function sendIpcRequest(process: NodeJS.Process | ChildProcess, path: string, args?: Record<string, unknown>): Promise<[boolean, unknown]>;
//#endregion
export { HyperAPIIpcDriver, sendIpcRequest };