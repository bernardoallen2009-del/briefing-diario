import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const colors = {
  green: [15, 107, 93, 255],
  black: [24, 23, 19, 255],
  ivory: [255, 253, 248, 255],
};

const letterB = [
  "11110",
  "10001",
  "10001",
  "11110",
  "10001",
  "10001",
  "11110",
];

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function setPixel(pixels, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const index = (y * size + x) * 4;
  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3];
}

function fillRoundedRect(pixels, size, x, y, width, height, radius, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      const left = px < x + radius;
      const right = px >= x + width - radius;
      const top = py < y + radius;
      const bottom = py >= y + height - radius;

      if ((left || right) && (top || bottom)) {
        const cx = left ? x + radius : x + width - radius - 1;
        const cy = top ? y + radius : y + height - radius - 1;
        if ((px - cx) ** 2 + (py - cy) ** 2 > radius ** 2) continue;
      }

      setPixel(pixels, size, px, py, color);
    }
  }
}

function drawLetter(pixels, size) {
  const cell = Math.floor(size * 0.075);
  const gap = Math.max(1, Math.floor(size * 0.01));
  const width = letterB[0].length * cell + (letterB[0].length - 1) * gap;
  const height = letterB.length * cell + (letterB.length - 1) * gap;
  const startX = Math.floor((size - width) / 2);
  const startY = Math.floor((size - height) / 2);

  letterB.forEach((row, rowIndex) => {
    [...row].forEach((value, colIndex) => {
      if (value !== "1") return;
      const x = startX + colIndex * (cell + gap);
      const y = startY + rowIndex * (cell + gap);
      fillRoundedRect(pixels, size, x, y, cell, cell, Math.floor(cell * 0.18), colors.ivory);
    });
  });
}

function png(size) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      setPixel(pixels, size, x, y, colors.green);
    }
  }

  const pad = Math.floor(size * 0.1);
  fillRoundedRect(pixels, size, pad, pad, size - pad * 2, size - pad * 2, Math.floor(size * 0.16), colors.black);
  drawLetter(pixels, size);

  const scanlines = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    scanlines[y * (size * 4 + 1)] = 0;
    pixels.copy(scanlines, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const publicDir = join(process.cwd(), "public");
writeFileSync(join(publicDir, "apple-touch-icon.png"), png(180));
writeFileSync(join(publicDir, "icon-192.png"), png(192));
writeFileSync(join(publicDir, "icon-512.png"), png(512));
