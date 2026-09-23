const IMAGE_LIMIT = 5 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ValidatedImage = { extension: "jpg" | "png" | "webp"; contentType: string };

/** Validate the declared MIME against the file signature and basic container bounds. */
export async function validateImageUpload(file: File): Promise<ValidatedImage | null> {
  if (!file.size || file.size > IMAGE_LIMIT || !ALLOWED_TYPES.has(file.type)) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length !== file.size) return null;

  if (file.type === "image/jpeg" && isJpeg(bytes)) return { extension: "jpg", contentType: file.type };
  if (file.type === "image/png" && isPng(bytes)) return { extension: "png", contentType: file.type };
  if (file.type === "image/webp" && isWebp(bytes)) return { extension: "webp", contentType: file.type };
  return null;
}

function isJpeg(bytes: Uint8Array): boolean {
  if (bytes.length < 6 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return false;
  // JPEG data must contain a start-of-scan marker before its end marker.
  for (let i = 2; i < bytes.length - 3; i++) if (bytes[i] === 0xff && bytes[i + 1] === 0xda) return true;
  return false;
}

function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 45 || !PNG_SIGNATURE.every((byte, i) => bytes[i] === byte)) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const firstChunkLength = view.getUint32(8);
  const firstChunkType = String.fromCharCode(...bytes.slice(12, 16));
  const end = bytes.length - 12;
  return firstChunkLength === 13 && firstChunkType === "IHDR" &&
    bytes[end + 4] === 0x49 && bytes[end + 5] === 0x45 && bytes[end + 6] === 0x4e && bytes[end + 7] === 0x44 &&
    view.getUint32(end) === 0;
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 20) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (text(0, 4) !== "RIFF" || text(8, 12) !== "WEBP" || view.getUint32(4, true) !== bytes.length - 8) return false;
  let offset = 12;
  let hasImageChunk = false;
  while (offset + 8 <= bytes.length) {
    const kind = text(offset, offset + 4);
    const length = view.getUint32(offset + 4, true);
    const end = offset + 8 + length;
    if (end > bytes.length) return false;
    if (["VP8 ", "VP8L", "VP8X"].includes(kind)) hasImageChunk = true;
    offset = end + (length % 2);
  }
  return hasImageChunk && offset === bytes.length;
}

