import { crc32, deflateSync } from 'node:zlib';
import type { RenderedImage } from '@resvg/resvg-js';

/** The cards are opaque: encode their exact RGB pixels without an alpha plane.
 * Unfiltered rows compress flat backgrounds and antialiased text particularly
 * well. Transparent artwork retains the renderer's original PNG encoder. */
export function encodeCardPng(image: RenderedImage): Buffer {
  const { pixels, width, height } = image;
  const rows = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = (y * width + x) * 4;
      if (pixels[source + 3] !== 255) return image.asPng();
      const target = y * (1 + width * 3) + 1 + x * 3;
      rows[target] = pixels[source]!;
      rows[target + 1] = pixels[source + 1]!;
      rows[target + 2] = pixels[source + 2]!;
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const result = Buffer.alloc(data.length + 12);
    result.writeUInt32BE(data.length);
    result.write(type, 4, 'ascii');
    data.copy(result, 8);
    result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2; // 8-bit RGB; filter/compression/interlace methods remain zero.
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
