# HyperAPI IPC Driver

[![npm version](https://img.shields.io/npm/v/@hyperapi/driver-ipc.svg)](https://www.npmjs.com/package/@hyperapi/driver-ipc)
[![license](https://img.shields.io/npm/l/@hyperapi/driver-ipc.svg?color=blue)](https://github.com/hyperapi/driver-ipc/blob/main/LICENSE)

A HyperAPI driver that enables inter-process communication (IPC) between Node.js or Bun processes with API.

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
  // path.join(import.meta.dir, 'my-api')
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

// Optional: Set up HyperAPI in parent too to allow children send requests to the parent process
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

> [!NOTE]
> Unlike HTTP drivers, IPC does not have verbs like `GET`, `POST`, etc. The driver uses the special `UNKNOWN` pseudo-method reserved for non-HTTP API servers by HyperAPI core.
>
> This means that you **can not** specify HTTP methods in your file names like `user.get.ts` — it will not be accessible for IPC requests.

### Creating API Endpoints

Create your API handlers in the default `hyper-api` directory:

**hyper-api/users/[id].ts**

```typescript
import { HyperAPIInvalidParametersError } from '@hyper-api/core';
import * as v from 'valibot';
import { hyperApi } from '../main.js';

// Define your validation library
export function valibot<S extends v.BaseSchema<any, any, any>>(schema: S) {
  return (request: HyperAPIRequest) => {
    const result = v.safeParse(schema, request.args);
    if (result.success) {
      return { args: result.data };
    }
    throw new HyperAPIInvalidParametersError();
  };
}

// Define your API method code
export default hyperApi.module()
  .use(valibot(
    v.object({ name: v.string() }),
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
  { key: 'value' }   // arguments (optional)
);
```

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
// import you HyperAPI instance
import { hyperApi } from '../main.ts';

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
