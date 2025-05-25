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
- ⚡ **Native Performance** - Built on Node.js native IPC, no external dependencies

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
const hyperApiCore = new HyperAPI({
  driver,
  // Optional: custom path to API methods
  // root: path.join(import.meta.dir, 'my-api')
});

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

// Optional: Set up HyperAPI in parent too
const driver = new HyperAPIIpcDriver(childProcess);
const hyperApiCore = new HyperAPI({
  driver,
  root: './parent-api'
});

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
> Unlike HTTP drivers, IPC does not have verbs like `GET`, `POST`, etc. The driver uses the special `UNKNOWN` pseudo-method reserved for non-HTTP API servers.
>
> This means you **cannot** specify HTTP methods in your file names like `[get]`, `[post]`, etc. Just omit them entirely when creating your API modules.

### Creating API Endpoints

Create your API handlers in the default `hyper-api` directory:

**hyper-api/users/[id].ts**
```typescript
import type { HyperAPIRequest, HyperAPIResponse } from '@hyperapi/core';
import * as v from 'valibot';

export default function(
  request: HyperAPIRequest<{ id: string }>,
): HyperAPIResponse {
  const { id } = request.args;

  // Mocking user lookup
  return {
    id,
    name: 'John Doe',
    email: 'john@example.com',
  };
}

export const argsValidator = v.parser(
  v.strictObject({
    id: v.string('User ID is required'),
  }),
);
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

The driver automatically translates HyperAPI errors into appropriate responses:

```typescript
import { HyperAPIBusyError } from '@hyperapi/core';

export default function(request: HyperAPIRequest): HyperAPIResponse {
  // Check some condition
  if (isLocked()) {
    throw new HyperAPIBusyError();
    // Client will receive [ false, { "code": 10, "description": "Endpoint is busy" }]
  }

  // Normal processing
  return { message: "Success" };
  // Client will receive [ true, { "message": "Success" }]
}
```

## TypeScript Support

The IPC driver provides full TypeScript support:

```typescript
import type { HyperAPIRequest, HyperAPIResponse } from '@hyperapi/core';
import * as v from 'valibot';

// Define validator for request arguments
export const argsValidator = v.parser(
  v.strictObject({
    id: v.string('User ID is required'),
  }),
);

export default function(
  // use validator as type for request arguments
  request: HyperAPIRequest<ReturnType<typeof argsValidator>>,
): HyperAPIResponse {
  // request.args.id are properly typed
  return {
    user: getUserById(request.args.id, request.args.includePrivate)
  };
}
```

## Contributing

Issues and pull requests are welcome at [our GitHub repository](https://github.com/hyperapi/driver-ipc).
