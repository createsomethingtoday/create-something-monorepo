export type MultipartField = readonly [name: string, value: string | File];

function safeHeaderValue(value: string): string {
  return value.replaceAll('\\', '%5C').replaceAll('"', '%22').replace(/[\r\n]/g, '');
}

export function encodeBrowserMultipart(
  fields: readonly MultipartField[],
  boundary = `create-something-${crypto.randomUUID()}`
): { body: Blob; contentType: string } {
  if (!/^[A-Za-z0-9_-]{16,96}$/.test(boundary)) {
    throw new Error('invalid_multipart_boundary');
  }
  const chunks: BlobPart[] = [];
  for (const [name, value] of fields) {
    const safeName = safeHeaderValue(name);
    chunks.push(`--${boundary}\r\n`);
    if (value instanceof File) {
      const safeFilename = safeHeaderValue(value.name);
      const contentType = /^[\w.+-]+\/[\w.+-]+$/.test(value.type)
        ? value.type
        : 'application/octet-stream';
      chunks.push(
        `Content-Disposition: form-data; name="${safeName}"; filename="${safeFilename}"\r\n`,
        `Content-Type: ${contentType}\r\n\r\n`,
        value,
        '\r\n'
      );
    } else {
      chunks.push(`Content-Disposition: form-data; name="${safeName}"\r\n\r\n`, value, '\r\n');
    }
  }
  chunks.push(`--${boundary}--\r\n`);
  return {
    body: new Blob(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}
