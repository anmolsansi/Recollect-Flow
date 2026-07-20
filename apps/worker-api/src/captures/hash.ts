export async function sha256(message: string): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(message).buffer);
}

export async function sha256Bytes(bytes: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
