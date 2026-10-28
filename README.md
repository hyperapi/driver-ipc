# HyperAPI IPC Driver

[![npm version](https://img.shields.io/npm/v/@hyperapi/driver-ipc.svg)](https://www.npmjs.com/package/@hyperapi/driver-ipc)
[![Open on npmx.dev](https://npmx.dev/api/registry/badge/version/@hyperapi/driver-ipc?style=shieldsio&label=npmx.dev)](https://npmx.dev/package/@hyperapi/driver-ipc)
[![license](https://img.shields.io/npm/l/@hyperapi/driver-ipc.svg?color=blue)](https://github.com/hyperapi/driver-ipc/blob/main/LICENSE)

A HyperAPI driver that exposes your API over inter-process communication (IPC) between Node.js or Bun processes.

## Features

- 🔄 **Inter-Process Communication** - Use HyperAPI endpoints across Node.js process boundaries
- 🔒 **Type Safety** - Full TypeScript support with HyperAPI's type inference
- 🧩 **File-based Routing** - Automatic endpoint generation from your file structure
- 🚀 **Bi-directional** - Both parent and child processes can expose and consume APIs
- 🛡️ **Error Handling** - Structured error responses compatible with HyperAPI's error system

## Installation

```bash
bun i @hyperapi/driver-ipc @hyperapi/core
# or with pnpm
pnpm add @hyperapi/driver-ipc @hyperapi/core
# or with npm
npm install @hyperapi/driver-ipc @hyperapi/core
```

## Quick Start

If you are new to HyperAPI, start with the [HyperAPI Core documentation](https://github.com/hyperapi/core) to understand the basics of creating APIs with file-based routing and type-safe handlers.

### Setting up a Child Process Service

Create a child process that exposes HyperAPI endpoints:

**child-service.js**
```typescript
import { HyperAPI } from '@hyperapi/core';
import { HyperAPIIpcDriver } from '@hyperapi/driver-ipc';

// Create the IPC driver using the current process
const driver = new HyperAPIIpcDriver(process);

// Initialize HyperAPI with the driver
export const hyperApi = new HyperAPI(
  driver,
  // Optional: custom path to API methods
  // new URL('my-api', import.meta.url).pathname
);

console.log('Child service is ready to handle IPC requests');
```

### Setting up the Parent Process

**parent.js**
```typescript
import { fork } from 'node:child_process';
import { HyperAPI } from '@hyperapi/core';
import { HyperAPIIpcDriver, sendIpcRequest } from '@hyperapi/driver-ipc';

// Fork a child process
const childProcess = fork('./child-service.js');

// Optional: set HyperAPI up in the parent too, so children can send requests back to it
const driver = new HyperAPIIpcDriver(childProcess);
export const hyperApi = new HyperAPI(driver, './parent-api');

// Send requests to child process
const [success, result] = await sendIpcRequest(
  childProcess, // process object to communicate with
  'users/123',  // API method path
  {},           // optional arguments
);

if (success) {
  console.log('User data:', result);
} else {
  console.error('Error:', result);
}
```

> [!IMPORTANT]
> Unlike HTTP, IPC has no verbs such as `GET` or `POST`. HyperAPI core still needs one, so this driver sends every request as `UNDEF`, the pseudo-method core reserves for transports without verbs.
>
> That makes the `+verb` suffix unreachable here. `users+get.ts` registers a `GET` route, so a request for `users` comes back as `[false, { code: 14, description: 'HTTP method not allowed' }]`. Name the file `users.ts` instead.
>
> A dot is not special, though: `users.get.ts` simply defines a method called `users.get`.

### Creating API Endpoints

Create your API handlers in the default `hyper-api` directory:

**hyper-api/users/[id].ts**

```typescript
import { HyperAPIInvalidParametersError } from '@hyperapi/core';
import type { HyperAPIRequest } from '@hyperapi/core/dev';
import * as v from 'valibot';
import { hyperApi } from '../main.js';

// Define your validation middleware
function valibot<S extends Parameters<typeof v.parser>[0]>(schema: S) {
  return (request: HyperAPIRequest) => {
    const result = v.safeParse(schema, request.args);
    if (result.success) {
      return { args: result.output };
    }

    throw new HyperAPIInvalidParametersError();
  };
}

// Define your API method code
export default hyperApi.module()
  .use(valibot(
    // `[id]` in the file name arrives as `args.id`
    v.object({ id: v.string() }),
  ))
  .action((request) => {
    const { id } = request.args;

    // Mocking user lookup
    return {
      id,
      name: 'John Doe',
      email: 'john@example.com',
    };
  });
```

## Request/Response Format

### Request Format

When using `sendIpcRequest`:

```typescript
const [success, result] = await sendIpcRequest(
  process,           // Node.js process or ChildProcess
  'method/path',     // API method (maps to file path)
  { key: 'value' },  // arguments (optional)
  { timeout: 30000 } // how long to wait for a response, ms (optional)
);
```

The returned promise **rejects** if the peer never answers within `timeout`, if
the IPC channel is closed, or if the response cannot be parsed. Only a response
that actually arrives resolves to the `[success, result]` tuple below.

### Response Format

The IPC driver returns a tuple to indicate success/failure and provide data:

```typescript
// Success response
[true, Record<string, unknown> | unknown[] | undefined]
// Error response
[false, { code: number, description: string, data?: Record<string, unknown> }]
```

## Error Handling

This driver automatically translates HyperAPI errors into appropriate responses. For example:

```typescript
import { HyperAPIBusyError } from '@hyperapi/core';
// import your HyperAPI instance
import { hyperApi } from '../main.js';

export default hyperApi.module().action((request) => {
  // Check some condition
  if (isLocked()) {
    throw new HyperAPIBusyError();
    // client will receive [ false, { "code": 10, "description": "Endpoint is busy" }]
  }

  // Normal processing
  return { message: "Success" };
  // client will receive [ true, { "message": "Success" }]
});
```

## Contributing

Issues and pull requests are welcome at [our GitHub repository](https://github.com/hyperapi/driver-ipc).
