/** What the stand-in answers one request with. */
export type Reply = {
  body?: unknown;
  /**
   * Where the body does not arrive whole: the connection is lost, or
   * nothing more comes.
   */
  cut?: 'broken' | 'stalled';
  headers?: Record<string, string>;
  status: number;
};

/** The reply a call that succeeds gets. */
export const success: Reply = {
  body: {
    keyType: 'admin',
    organizationId: 'test',
    organizationName: 'test',
    scopes: ['read'],
    brandIds: ['test'],
    createdAt: '2026-01-01T00:00:00Z',
    expiresAt: '2026-01-01T00:00:00Z',
    rateLimit: { limit: 0, window: 'minute' },
    createdBy: 'test',
    lastUsedAt: '2026-01-01T00:00:00Z',
  },
  status: 200,
};

/**
 * A stand-in for the API, passed to the client as its `fetch`. It answers
 * each request with the next of `replies`, then the last one again, and
 * keeps every request it is sent. A reply that is `cut` sends its status
 * and headers, then a body that fails or never ends.
 */
export function standIn(replies: Array<Reply>) {
  const requests: Array<Request> = [];
  async function fetch(input: string, init: RequestInit): Promise<Response> {
    requests.push(new Request(input, init));
    const index = Math.min(requests.length, replies.length) - 1;
    const reply = replies[index];
    if (reply.cut) {
      return new Response(
        new ReadableStream({
          start: (controller) => {
            if (reply.cut === 'broken') {
              controller.error(new Error('The connection was lost.'));
            }
          },
        }),
        { status: reply.status },
      );
    }
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      headers: { 'content-type': 'application/json', ...reply.headers },
      status: reply.status,
    });
  }
  return { fetch, requests };
}

/** A `fetch` that never answers, and gives up when the client does. */
export function unanswered(_input: string, init: RequestInit): Promise<Response> {
  return new Promise<Response>((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => {
      reject(init.signal?.reason);
    });
  });
}

/** A logger that keeps each line it is given, as JSON. */
export function recorder() {
  const lines: Array<string> = [];
  function log(message: string, rest: unknown) {
    lines.push(JSON.stringify([message, rest]));
  }
  return {
    lines,
    logger: {
      debug: log,
      error: log,
      info: log,
      warn: log,
    },
  };
}
