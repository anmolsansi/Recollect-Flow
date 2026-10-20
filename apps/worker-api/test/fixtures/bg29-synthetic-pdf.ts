/**
 * BG-29.078 synthetic-only PDF objects for local R2/real unpdf extraction.
 * ASCII is intentional: it makes PDF xref byte offsets deterministic.
 * This test fixture must never be imported into production runtime code.
 */
export function bg29PdfSentinel(index: number): string {
  if (!Number.isInteger(index) || index < 1 || index > 12) {
    throw new RangeError('BG29 PDF index must be 1..12');
  }
  return `BG29_STAGING_PDF_SENTINEL_${String(index).padStart(2, '0')}`;
}

export function createBg29PdfFixture(index: number): ArrayBuffer {
  const text = bg29PdfSentinel(index);
  const stream = `BT /F1 12 Tf 72 100 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const [i, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;
  const data = new TextEncoder().encode(pdf);
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
}

export async function bg29PdfSha256(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
}
