import type { Result } from './types';

export function discardBody(result: Result | undefined): void {
  const { response } = result ?? {};
  if (response && !response.bodyUsed) void response.body?.cancel().catch(() => {});
}

export function isStreamed(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  return typeof (body as ReadableStream).getReader === 'function' || Symbol.asyncIterator in body;
}

export function replyWith(body: ReadableStream<Uint8Array> | null, response: Response): Response {
  const reply = new Response(body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
  Object.defineProperty(reply, 'redirected', { value: response.redirected });
  Object.defineProperty(reply, 'url', { value: response.url });
  return reply;
}

export async function bufferReply(response: Response, signal?: AbortSignal): Promise<Response> {
  if (response.body === null) return response;
  const reader = response.body.getReader();

  function cancel(): void {
    void reader.cancel(signal?.reason).catch(() => {});
  }

  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, { once: true });

  const parts: Array<Uint8Array> = [];
  try {
    for (;;) {
      const step = await reader.read();
      if (step.done) break;
      parts.push(step.value);
    }
  } finally {
    signal?.removeEventListener('abort', cancel);
  }
  if (signal?.aborted) throw signal.reason;

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });
  return replyWith(body, response);
}
