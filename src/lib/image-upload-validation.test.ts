import { describe, expect, it } from "vitest";
import { validateImageUpload } from "./image-upload-validation";

const png = Uint8Array.from([137,80,78,71,13,10,26,10, 0,0,0,13, 73,72,68,82, 0,0,0,1, 0,0,0,1, 8,6,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 73,69,78,68, 0,0,0,0]);
const jpeg = Uint8Array.from([0xff,0xd8,0xff,0xda,0x00,0x02,0x01,0x02,0xff,0xd9]);
const webp = Uint8Array.from([0x52,0x49,0x46,0x46,0x0c,0x00,0x00,0x00,0x57,0x45,0x42,0x50,0x56,0x50,0x38,0x20,0x00,0x00,0x00,0x00]);
const file = (bytes: Uint8Array, type: string, name = "upload") => new File([Buffer.from(bytes)], name, { type });

describe("validateImageUpload", () => {
  it("accepts structurally complete JPEG, PNG and WebP files", async () => {
    await expect(validateImageUpload(file(jpeg, "image/jpeg"))).resolves.toMatchObject({ extension: "jpg" });
    await expect(validateImageUpload(file(png, "image/png"))).resolves.toMatchObject({ extension: "png" });
    await expect(validateImageUpload(file(webp, "image/webp"))).resolves.toMatchObject({ extension: "webp" });
  });
  it("rejects MIME/signature mismatches and truncated or broken containers", async () => {
    await expect(validateImageUpload(file(png, "image/jpeg"))).resolves.toBeNull();
    await expect(validateImageUpload(file(jpeg.slice(0, 5), "image/jpeg"))).resolves.toBeNull();
    await expect(validateImageUpload(file(webp.slice(0, 15), "image/webp"))).resolves.toBeNull();
    await expect(validateImageUpload(file(new Uint8Array([1, 2, 3]), "image/png"))).resolves.toBeNull();
  });
  it("rejects files over the 5 MB limit before parsing", async () => {
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
    await expect(validateImageUpload(oversized)).resolves.toBeNull();
  });
});
