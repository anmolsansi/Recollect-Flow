import { z } from 'zod';

export const CURSOR_VERSION = 1;

export const cursorPayloadSchema = z
  .object({
    v: z.literal(CURSOR_VERSION),
    mode: z.enum(['keyword', 'filter']),
    r: z.number().finite().optional(),
    t: z.string().datetime({ offset: true }),
    i: z.string().min(1).max(128),
    f: z.string().regex(/^[A-Za-z0-9_-]{16}$/),
    c: z.string().datetime({ offset: true }),
  })
  .strict();

export type CursorData = z.infer<typeof cursorPayloadSchema>;

export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  return Buffer.from(json, 'utf-8').toString('base64url');
}

export function decodeCursor(
  cursorStr: string,
  currentMode: 'keyword' | 'filter',
): CursorData | null {
  try {
    if (
      cursorStr.length === 0 ||
      cursorStr.length % 4 === 1 ||
      !/^[A-Za-z0-9_-]+$/.test(cursorStr)
    ) {
      return null;
    }

    const bytes = Buffer.from(cursorStr, 'base64url');
    if (bytes.toString('base64url') !== cursorStr) {
      return null;
    }

    const json = bytes.toString('utf-8');
    const parsed = JSON.parse(json);
    const result = cursorPayloadSchema.safeParse(parsed);
    if (!result.success) return null;

    const data = result.data;

    if (data.mode !== currentMode) return null;

    if (data.mode === 'keyword' && data.r === undefined) return null;
    if (data.mode === 'filter' && data.r !== undefined) return null;

    return data;
  } catch {
    return null;
  }
}

export async function generateFingerprint(
  input: Record<string, unknown>,
  effectiveTokens: string[],
): Promise<string> {
  const canonical: Record<string, unknown> = {};

  if (effectiveTokens.length > 0) {
    canonical.q = effectiveTokens.join(' ');
  }

  const keys = Object.keys(input)
    .filter((k) => k !== 'cursor' && k !== 'limit' && k !== 'q')
    .sort();

  for (const key of keys) {
    let val = input[key];
    if (val === undefined || val === null || val === '') {
      continue;
    }

    if (typeof val === 'string') {
      val = val.trim().normalize('NFC');
    } else if (Array.isArray(val)) {
      const uniqueVals = Array.from(new Set(val));
      uniqueVals.sort((a, b) => String(a).localeCompare(String(b)));
      val = uniqueVals;
    }

    canonical[key] = val;
  }

  const str = JSON.stringify(canonical);
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str),
  );
  return Buffer.from(buffer).toString('base64url').substring(0, 16);
}
