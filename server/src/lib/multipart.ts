export function parseMultipartForm(
  buffer: Buffer,
  contentType: string,
): { fields: Record<string, string>; files: Array<{ field: string; filename: string; mimeType: string; bytes: Buffer }> } {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary = match?.[1] ?? match?.[2]?.trim();
  if (!boundary) {
    return { fields: {}, files: [] };
  }
  const delim = Buffer.from(`--${boundary}`);
  const fields: Record<string, string> = {};
  const files: Array<{ field: string; filename: string; mimeType: string; bytes: Buffer }> = [];

  let offset = indexOf(buffer, delim, 0);
  while (offset >= 0) {
    const partStart = offset + delim.length;
    if (buffer[partStart] === 0x2d && buffer[partStart + 1] === 0x2d) break;
    let dataStart = partStart;
    if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) dataStart += 2;
    const headerEnd = indexOf(buffer, Buffer.from("\r\n\r\n"), dataStart);
    if (headerEnd < 0) break;
    const headers = buffer.subarray(dataStart, headerEnd).toString("utf8");
    const next = indexOf(buffer, delim, headerEnd + 4);
    const partEnd = next < 0 ? buffer.length : next;
    let body = buffer.subarray(headerEnd + 4, partEnd);
    if (body.length >= 2 && body[body.length - 2] === 0x0d && body[body.length - 1] === 0x0a) {
      body = body.subarray(0, body.length - 2);
    }
    const name = /name="([^"]+)"/i.exec(headers)?.[1];
    const filename = /filename="([^"]*)"/i.exec(headers)?.[1];
    const mime = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1]?.trim() ?? "application/octet-stream";
    if (name && filename) {
      files.push({ field: name, filename, mimeType: mime, bytes: Buffer.from(body) });
    } else if (name) {
      fields[name] = body.toString("utf8");
    }
    offset = next;
  }
  return { fields, files };
}

function indexOf(haystack: Buffer, needle: Buffer, from: number) {
  return haystack.indexOf(needle, from);
}
