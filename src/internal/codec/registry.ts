import type { BodyInput, Codec, EncodedBody, ResolvedOptions } from '../core/types';

export const NO_BODY = null;

function charsetOf(contentType: string | null): string | undefined {
  return contentType?.match(/;\s*charset\s*=\s*"?([^";\s]+)/i)?.[1];
}

function decoderFor(label: string | undefined, fatal: boolean) {
  try {
    return new TextDecoder(label, { fatal });
  } catch {
    return new TextDecoder('utf-8', { fatal });
  }
}

export async function readText(raw: Response, json = false): Promise<string> {
  const label = json ? undefined : charsetOf(raw.headers.get('content-type'));
  return decoderFor(label, raw.ok).decode(await raw.arrayBuffer());
}

export function essenceOf(mediaType: string): string {
  return mediaType.split(';', 1)[0]!.trim().toLowerCase();
}

export function selectCodec(
  codecs: ReadonlyArray<Codec>,
  mediaType: string | undefined,
): Codec | undefined {
  if (!mediaType) return undefined;
  const essence = essenceOf(mediaType);
  const format = essence.replace(/\/.*\+/, '/');
  return codecs.find((codec) =>
    codec.mediaTypes.some((candidate) => [essence, format].includes(essenceOf(candidate))),
  );
}

export function encodeNamedBody(
  codecs: ReadonlyArray<Codec>,
  mediaType: string | undefined,
  options: ResolvedOptions,
): EncodedBody | undefined {
  if (options.body === undefined) return undefined;

  if (options.bodySerializer) {
    return { contentType: mediaType, payload: options.bodySerializer(options.body) };
  }
  if (options.bodySerializer === null) {
    return { contentType: mediaType, payload: options.body as BodyInput };
  }

  const codec = selectCodec(codecs, mediaType);
  if (!codec) return { contentType: mediaType, payload: options.body as BodyInput };
  return { contentType: codec.contentType, payload: codec.encode(options.body) };
}
