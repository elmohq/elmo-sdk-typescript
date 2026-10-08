export function scalarText(value: unknown): string | undefined {
  return value instanceof Date ? value.toISOString() : undefined;
}

export function toText(value: unknown): string {
  return typeof value === 'string' ? value : (scalarText(value) ?? String(value));
}
