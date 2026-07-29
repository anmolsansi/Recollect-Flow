export function positiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function safeFilename(value: string): string {
  const sanitized = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code < 32 ||
      code === 127 ||
      character === '"' ||
      character === '\\' ||
      character === '/'
      ? '_'
      : character;
  })
    .join('')
    .trim();
  return (sanitized || 'shared-item').slice(0, 255);
}
