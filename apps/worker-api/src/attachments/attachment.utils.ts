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

export function attachmentContentDisposition(value: string): string {
  const sanitized = safeFilename(value);
  const asciiFallback = Array.from(sanitized, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint >= 32 && codePoint <= 126 ? character : '_';
  }).join('');
  const filename = asciiFallback || 'shared-item';

  if (filename === sanitized) {
    return `attachment; filename="${filename}"`;
  }

  const encoded = encodeURIComponent(sanitized)
    .replaceAll("'", '%27')
    .replaceAll('(', '%28')
    .replaceAll(')', '%29')
    .replaceAll('*', '%2A');

  return `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`;
}
