# Elmo TypeScript SDK

[![npm](https://img.shields.io/npm/v/@elmohq/sdk)](https://www.npmjs.com/package/@elmohq/sdk) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE.md)

Read and manage the brands, prompts, competitors, and AI-visibility analytics of this deployment.

This package calls the Elmo API from TypeScript and JavaScript. It includes types for every request and reply.

[Issues](https://github.com/elmohq/elmo-sdk-typescript/issues)

## Installation

The SDK is published on [npm](https://www.npmjs.com/package/@elmohq/sdk). Install it with the package manager you use.

```sh
npm install @elmohq/sdk
```

<details>
<summary>Other package managers</summary>

```sh
pnpm add @elmohq/sdk
```

```sh
yarn add @elmohq/sdk
```

```sh
bun add @elmohq/sdk
```

```sh
deno add npm:@elmohq/sdk
```

```sh
nub add @elmohq/sdk
```

```sh
vlt install @elmohq/sdk
```

```sh
aube add @elmohq/sdk
```

</details>

## Usage

Set [`ELMO_API_KEY`](https://elmohq.com/docs/api#authentication) in your environment, then call the API:

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo();
const data = await elmo.brands.list();

console.log(data);
```

## Requirements

- Node.js 20.19 or later
- TypeScript 5.5 or later, for its types, and 5.8 or later to `require()` it from CommonJS

## Pagination

Iterate a paginated call to read every item. Each page is fetched when the loop reaches it.

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo();
for await (const item of elmo.brands.list()) {
  console.log(item);
}
```

## Errors

When the API answers with an error status, the call throws `APIError`, or a subclass named for the status. `requestId` holds the id to quote when you report a failure. Every error the SDK throws extends `ElmoError`.

```ts
import { APIError, Elmo } from '@elmohq/sdk';

const elmo = new Elmo();
try {
  await elmo.brands.list();
} catch (error) {
  if (error instanceof APIError) {
    console.log(error.status, error.requestId, error.body);
  } else {
    throw error;
  }
}
```

To handle a failure without `try`, call `.result()`. It resolves with `ok: false` and a typed `error`. Checking `result.status` narrows `error.body` to the body the API description declares for that status.

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo();
const result = await elmo.brands.list().result();
if (!result.ok) {
  if (result.status === 401) {
    console.log(result.error.body);
  } else {
    console.log(result.error);
  }
}
```

Catch one status by its class:

| Status                 | Error                      |
| ---------------------- | -------------------------- |
| 400                    | `BadRequestError`          |
| 401                    | `AuthenticationError`      |
| 402                    | `PaymentRequiredError`     |
| 403                    | `PermissionDeniedError`    |
| 404                    | `NotFoundError`            |
| 409                    | `ConflictError`            |
| 422                    | `UnprocessableEntityError` |
| 429                    | `RateLimitError`           |
| 500 and above          | `InternalServerError`      |
| Any other error status | `APIError`                 |

A call that got no reply has no status. It throws `TransportError`, or `TimeoutError` where an attempt ran out of time. Neither is an `APIError`.

A call made with no credential throws `MissingCredentialError` before anything is sent. A reply the SDK cannot read throws `DecodeError`. A call you cancel through `signal` throws `AbortError`.

By the time a call throws `RateLimitError`, the client has sent it again up to 2 times. `retryAfterMs` on `RateLimitError` holds how long the API asked to wait, in milliseconds, where it said.

To report a failure, [open an issue](https://github.com/elmohq/elmo-sdk-typescript/issues) and quote `requestId`.

## Configuration

### Authentication

The client reads `ELMO_API_KEY` from the environment. To pass the value yourself, set `apiKey`:

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo({ apiKey: 'elmo_…' });
```

Get `apiKey` from [the page that issues it](https://elmohq.com/docs/api#authentication). `apiKey` also takes a function that returns the value, such as one that reads it from a secret store. The client calls it for each request.

### Browser usage

This client refuses to build in a browser, where every visitor to the page can read the credential it sends. Build it on a server instead. Pass `dangerouslyAllowBrowser: true` only where the credential is meant to be public, or a proxy adds it.

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo({ dangerouslyAllowBrowser: true });
```

### Base URL

Calls go to `/api/v1`. To send them elsewhere, such as a proxy or a gateway, set `baseURL`, or the `ELMO_BASE_URL` environment variable:

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo({ baseURL: 'https://gateway.example.com' });
```

### Per-call options

One call can run under settings of its own. `withOptions` returns a client that differs only in what you pass, and takes every option the client does. Headers merge per name, and every other option replaces the client's:

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo();
await elmo.withOptions({ timeout: 5000, maxRetries: 0 }).brands.list();
```

A call also takes the same settings as its last argument.

### Retries

A failed call is sent again up to 2 times, after a lost connection, a 408, 425 or 429 status, or most 5xx statuses. A `POST` or `PATCH` call may already have changed something, so it is sent again only after a request that never reached the API or a 408, 425 or 429 status.

Each wait is longer than the last on average, or as long as `Retry-After` asks.

To change that count, set `maxRetries` on the client or on one call. For every other rule, such as which failures are retried and how long each wait is, set `retry`, which takes a `RetryOptions`:

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo({ maxRetries: 5 });
await elmo.withOptions({ maxRetries: 0 }).brands.list();
```

To wait longer between attempts, set the first wait and the longest one:

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo({ retry: { delay: 1000, maxDelay: 10000 } });
```

### Timeouts

Each attempt may run for 60 seconds. One that runs longer throws `TimeoutError`. To change the limit, set `timeout` in milliseconds on the client or on one call. `false` removes it:

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo({ timeout: 20_000 });
await elmo.withOptions({ timeout: 5000 }).brands.list();
```

### Logging

Logging is off by default. To see what the SDK sends and receives, set `logLevel` or the `ELMO_LOG` environment variable. `'info'` logs each call and its reply, and `'debug'` adds headers, with credentials redacted. Bodies are never logged. Logs go to `console` unless you pass a `logger`.

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo({ logLevel: 'info' });
```

### Custom fetch

To send requests through a proxy, with other TLS options or over HTTP/2, pass a `fetch` of your own. It is called with the URL as a string and a `RequestInit`, and returns a `Response`, so it can wrap the global one or call a library's. To add `RequestInit` fields to every request instead, such as `credentials`, pass `fetchOptions`.

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo({
  fetch: async (input, init) => {
    const started = performance.now();
    const response = await fetch(input, init);
    console.log(input, response.status, performance.now() - started);
    return response;
  },
});
```

### Default headers

To send a header with every call, set `defaultHeaders` on the client. A call's own `headers` are merged with them by name, and `null` drops one:

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo({ defaultHeaders: { 'x-team': 'billing' } });
```

### Interceptors

To run code of your own around every call, set `interceptors` on the client. A `request` hook runs on each request last before it is sent, with the credential already on it. A `response` hook returns the result the caller reads, and an `error` hook returns the error the caller gets, so a hook that only observes returns what it was given. Hooks run in the order you list them.

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo({
  interceptors: {
    request: [
      (request) => {
        request.meta['x-request-source'] = 'worker';
      },
    ],
  },
});
```

### Raw response

To read the HTTP response as well, call `.withResponse()` on a call. What comes back holds:

- `data`: what the call resolves with on its own
- `response`: the `Response` that carried it, for a header or a field the SDK does not model
- `requestId`: the id to quote when you report a problem

```ts
import { Elmo } from '@elmohq/sdk';

const elmo = new Elmo();
const reply = await elmo.me.get().withResponse();
console.log(reply.response.status, reply.response.headers.get('content-type'));
```

`.asResponse()` resolves with the `Response` alone, with its body unread.

### Environment variables

The client reads each variable when its option is not set:

| Variable        | Option     | Default     |
| --------------- | ---------- | ----------- |
| `ELMO_API_KEY`  | `apiKey`   |             |
| `ELMO_BASE_URL` | `baseURL`  | `'/api/v1'` |
| `ELMO_LOG`      | `logLevel` | `'off'`     |

### Forward compatibility

The API can add a field or a value after this version of the SDK is released. This version keeps working when that happens, and you can use the new part of the API before a release declares it.

- A reply is handed back as the API sent it. A field, an enum value or a member of a union that this version does not declare is there to read, though the types do not name it.
- To send a field this version does not declare, write it in the inputs beside the fields it does. TypeScript refuses a key it does not know in an object literal, so spread it in from an object of its own.

### Bundle size

Where bundle size matters, such as in a browser app, call a function from `@elmohq/sdk/calls` instead. A bundle keeps only the calls you import.

```ts
import { createElmoClient } from '@elmohq/sdk';
import { brandsList } from '@elmohq/sdk/calls';

const client = createElmoClient();
await brandsList(client);
```

## License

MIT. See [LICENSE.md](LICENSE.md).
