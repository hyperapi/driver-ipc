import { HyperAPIDriver, HyperAPIDriverHandler, HyperAPIRequest } from "@hyperapi/core";
import { ChildProcess } from "node:child_process";

//#region src/main.d.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare class HyperAPIIpcDriver implements HyperAPIDriver<HyperAPIRequest<any>> {
  readonly process: NodeJS.Process | ChildProcess;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private hyperapi_handler?;
  constructor(process?: NodeJS.Process | ChildProcess);
  /**
  * Starts the server.
  * @param hyperapi_handler - The handler to use.
  */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  start(hyperapi_handler: HyperAPIDriverHandler<HyperAPIRequest<any>>): void;
  /**
  * Stops the server.
  */
  // eslint-disable-next-line class-methods-use-this
  stop(): void;
  /**
  * Handles the request.
  * @param path - API method path.
  * @param args - API method arguments.
  * @returns -
  */
  private processRequest;
}
/**
* Sends a request to the process.
* @param process - The process to send the request to.
* @param path - The API method path.
* @param args - The API method arguments.
* @returns -
*/
declare function sendIpcRequest(process: NodeJS.Process | ChildProcess, path: string, args?: Record<string, unknown>): Promise<[boolean, unknown]>; //#endregion
export { HyperAPIIpcDriver, sendIpcRequest };