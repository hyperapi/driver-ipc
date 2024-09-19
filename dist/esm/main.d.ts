import { type HyperAPIDriver, type HyperAPIDriverHandler, type HyperAPIRequest } from '@hyperapi/core';
import type { ChildProcess } from 'node:child_process';
export declare class HyperAPIIpcDriver implements HyperAPIDriver<HyperAPIRequest<any>> {
    readonly process: NodeJS.Process | ChildProcess;
    private hyperapi_handler?;
    constructor(process?: NodeJS.Process | ChildProcess);
    /**
     * Starts the server.
     * @param hyperapi_handler - The handler to use.
     */
    start(hyperapi_handler: HyperAPIDriverHandler<HyperAPIRequest<any>>): void;
    /**
     * Stops the server.
     */
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
export declare function sendIpcRequest(process: NodeJS.Process | ChildProcess, path: string, args?: Record<string, unknown>): Promise<[boolean, unknown]>;
