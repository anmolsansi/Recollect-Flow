const SENSITIVE_KEY =
  /(^|_)(token|secret|password|authorization|cookie|api[_-]?key|credential)(_|$)/i;

export function sanitizePortableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizePortableValue);
  if (!value || typeof value !== 'object') return value;

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) continue;
    result[key] = sanitizePortableValue(nested);
  }
  return result;
}
