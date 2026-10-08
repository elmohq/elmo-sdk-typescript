import { toAPIError, undeclaredBody, unreadableBody } from './errors';
import type { BuildURL } from './url';
import { essenceOf, NO_BODY, readText, selectCodec } from '../../codec/registry';
import { baseURLOf } from '../../core/config';
import { classifyError, ElmoError, isStructured, unansweredError } from '../../core/errors';
import { metadataValue } from '../../core/metadata';
import type {
  Binding,
  CallableDescriptor,
  Codec,
  Credential,
  PreparedRequest,
  ResolvedOptions,
  Result,
} from '../../core/types';

const DEFAULT_ACCEPT = 'application/json';

function placeInHeader(credential: Credential, request: PreparedRequest<string>): void {
  request.meta[credential.name.toLowerCase()] = credential.value;
}

type Placer = (credential: Credential, request: PreparedRequest<string>) => void;

const PLACERS: Partial<Readonly<Record<Credential['in'], Placer>>> = { header: placeInHeader };

function declaredReply(value: unknown, raw: Response, request: PreparedRequest<string>): unknown {
  if (request.callable.returns !== 'json' || isStructured(value)) return value;
  throw undeclaredBody(raw, value);
}

function parserFor(contentType: string | null): 'blob' | 'json' | 'text' {
  if (!contentType) return 'text';
  const essence = essenceOf(contentType);
  if (essence === 'application/json' || essence.endsWith('+json')) return 'json';
  if (essence.startsWith('text/')) return 'text';
  return 'blob';
}

function asksForJSON(request: PreparedRequest<string>): boolean {
  const accept = metadataValue(request.meta['accept']);
  return !!accept && accept.split(',').every((one) => parserFor(one) === 'json');
}

function jsonOrText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readBody(
  raw: Response,
  request: PreparedRequest<string>,
  codecs: ReadonlyArray<Codec> = [],
): Promise<unknown> {
  if (raw.body === null || raw.headers.get('content-length') === '0') return NO_BODY;

  const contentType = raw.headers.get('content-type');
  const codec = selectCodec(codecs, contentType ?? undefined);
  const parser = parserFor(contentType);
  const copy = raw.ok ? undefined : raw.clone();

  try {
    if (codec?.decode) return await codec.decode(raw);
    if (parser === 'blob') return await raw.blob();

    const text = await readText(raw, parser === 'json');
    if (text === '') return NO_BODY;
    if (parser === 'json') return JSON.parse(text);
    return asksForJSON(request) ? jsonOrText(text) : text;
  } catch (error) {
    if (error instanceof ElmoError) throw error;
    if (classifyError(error) === 'abort') throw unansweredError(error);
    if (copy) {
      return readText(copy).catch(() => {
        throw unreadableBody(raw, error);
      });
    }
    throw unreadableBody(raw, error);
  }
}

export function createRestBinding(buildURL: BuildURL): Binding<string> {
  return {
    accept: DEFAULT_ACCEPT,
    applyAuth(credential: Credential, request: PreparedRequest<string>): void {
      const place = PLACERS[credential.in];
      if (!place) {
        throw new ElmoError(
          `This client places no credential in the ${credential.in}, so "${request.callable.address}" cannot be authenticated.`,
        );
      }
      place(credential, request);
    },
    name: 'rest',
    readError(result: Result, request: PreparedRequest<string>): unknown {
      const { response } = result;
      if (!response || (response.ok && result.error === undefined)) return;
      return toAPIError(response.status, result.error, response, request.unauthenticated);
    },
    async readResult(
      raw: Response,
      request: PreparedRequest<string>,
      codecs: ReadonlyArray<Codec>,
    ): Promise<Result> {
      if (request.options.unread) return { ok: raw.ok, response: raw, status: raw.status };

      const value =
        raw.status === 204 || raw.status === 205 ? NO_BODY : await readBody(raw, request, codecs);

      return raw.ok
        ? { data: declaredReply(value, raw, request), ok: true, response: raw, status: raw.status }
        : { error: value, ok: false, response: raw, status: raw.status };
    },
    resolveAddress(callable: CallableDescriptor, options: ResolvedOptions): string {
      return buildURL({
        address: callable.address,
        baseURL: baseURLOf(options, callable.baseURL),
        path: options.path,
        query: options.query,
        serialization: callable.serialization,
      });
    },
  };
}
