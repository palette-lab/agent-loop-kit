import { deflateRawSync } from 'node:zlib';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { repoRoot } from '../src/looplib.mjs';

const sourceDir = join(repoRoot, 'skills', 'loopwright');
const outPath = process.argv[2] ?? join(repoRoot, 'dist', 'loopwright-skill.zip');

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(path);
      return entry.isFile() ? [path] : [];
    })
    .sort();
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function localHeader(fileName, metadata) {
  const name = Buffer.from(fileName);
  return Buffer.concat([
    u32(0x04034b50),
    u16(20),
    u16(0),
    u16(8),
    u16(metadata.time),
    u16(metadata.day),
    u32(metadata.crc),
    u32(metadata.compressedSize),
    u32(metadata.size),
    u16(name.length),
    u16(0),
    name
  ]);
}

function centralHeader(fileName, metadata, offset) {
  const name = Buffer.from(fileName);
  return Buffer.concat([
    u32(0x02014b50),
    u16(20),
    u16(20),
    u16(0),
    u16(8),
    u16(metadata.time),
    u16(metadata.day),
    u32(metadata.crc),
    u32(metadata.compressedSize),
    u32(metadata.size),
    u16(name.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(offset),
    name
  ]);
}

function endRecord(fileCount, centralSize, centralOffset) {
  return Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(fileCount),
    u16(fileCount),
    u32(centralSize),
    u32(centralOffset),
    u16(0)
  ]);
}

const files = listFiles(sourceDir);
const localParts = [];
const centralParts = [];
let offset = 0;

for (const file of files) {
  const body = readFileSync(file);
  const compressed = deflateRawSync(body, { level: 9 });
  const stat = statSync(file);
  const metadata = {
    ...dosDateTime(stat.mtime),
    crc: crc32(body),
    size: body.length,
    compressedSize: compressed.length
  };
  const zipName = relative(join(repoRoot, 'skills'), file).split('\\').join('/');
  const header = localHeader(zipName, metadata);
  localParts.push(header, compressed);
  centralParts.push(centralHeader(zipName, metadata, offset));
  offset += header.length + compressed.length;
}

const centralOffset = offset;
const central = Buffer.concat(centralParts);
const archive = Buffer.concat([...localParts, central, endRecord(files.length, central.length, centralOffset)]);

if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, archive);
console.log(`Packaged ${files.length} skill file(s) into ${outPath}`);
