// Pixel dimensions from PNG and JPEG headers. No decoding.
export function imageDimensions(buffer) {
  if (buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.toString('ascii', 12, 16) === 'IHDR') {
    return { format: 'png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let p = 2;
    while (p + 9 < buffer.length) {
      if (buffer[p] !== 0xff) {
        p += 1;
        continue;
      }
      const marker = buffer[p + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        p += 2;
        continue;
      }
      const length = buffer.readUInt16BE(p + 2);
      const isSof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
      if (isSof) {
        return { format: 'jpeg', height: buffer.readUInt16BE(p + 5), width: buffer.readUInt16BE(p + 7) };
      }
      p += 2 + length;
    }
    return { format: 'jpeg', width: null, height: null };
  }
  return { format: 'unknown', width: null, height: null };
}
