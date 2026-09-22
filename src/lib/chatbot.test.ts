import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/cafe-assistant/route";

async function ask(query: unknown) {
  const req = new Request("http://localhost:3000/api/cafe-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(typeof query === "object" ? query : { query }),
  });
  const res = await POST(req);
  const data = await res.json();
  return { status: res.status, data };
}

describe("Chatbot API Suite", () => {
  it("Scenario 1: Recommends quiet/reading cafes", async () => {
    const { status, data } = await ask("อยากได้ร้านบรรยากาศเงียบๆ ไว้อ่านหนังสือ");
    expect(status).toBe(200);
    expect(data.cafes.length).toBeGreaterThan(0);
    const name = (c: any) => typeof c.name === "object" ? c.name.th : c.name;
    console.log("\n[Test 1 - อ่านหนังสือ]: พบร้าน ->", data.cafes.map(name));
  });

  it("Scenario 2: Answers specific cafe opening hours", async () => {
    const { status, data } = await ask("บ้านบานน์เปิดกี่โมง");
    expect(status).toBe(200);
    expect(data.cafes.length).toBeGreaterThan(0);
    expect(data.cafes[0].slug).toBe("baan-baann");
    const name = typeof data.cafes[0].name === "object" ? data.cafes[0].name.th : data.cafes[0].name;
    console.log("\n[Test 2 - เวลาเปิดปิดบ้านบานน์]:", name, "เปิด:", data.cafes[0].openTime, "-", data.cafes[0].closeTime);
  });

  it("Scenario 3: Recommends late night cafes", async () => {
    const { status, data } = await ask("ร้านเปิดดึก");
    expect(status).toBe(200);
    expect(data.cafes.length).toBeGreaterThan(0);
    const name = (c: any) => typeof c.name === "object" ? c.name.th : c.name;
    console.log("\n[Test 3 - ร้านเปิดดึก]: พบร้าน ->", data.cafes.map((c: any) => `${name(c)} (ปิด ${c.closeTime})`));
  });

  it("Scenario 4: Recommends relaxing/healing cafes", async () => {
    const { status, data } = await ask("อยากพักผ่อนฮีลใจ");
    expect(status).toBe(200);
    expect(data.cafes.length).toBeGreaterThan(0);
    const name = (c: any) => typeof c.name === "object" ? c.name.th : c.name;
    console.log("\n[Test 4 - พักผ่อนฮีลใจ]: พบร้าน ->", data.cafes.map(name));
  });

  it("Scenario 5: Declines requests for other provinces (e.g. Chiang Mai)", async () => {
    const { status, data } = await ask("ร้านกาแฟในเชียงใหม่");
    expect(status).toBe(200);
    expect(data.cafes.length).toBe(0);
    expect(data.message).toContain("ยังไม่พบร้านที่ตรงกับคำถาม");
    console.log("\n[Test 5 - ปฏิเสธนอกพื้นที่]: ข้อความตอบกลับ ->", data.message);
  });

  it("Scenario 6: Rejects irrelevant queries gracefully", async () => {
    const { status, data } = await ask("ช่วยเขียนโค้ด Python ให้หน่อย");
    expect(status).toBe(200);
    expect(data.cafes.length).toBe(0);
    expect(data.message).toContain("ยังไม่พบร้านที่ตรงกับคำถาม");
    console.log("\n[Test 6 - คำถามที่ไม่เกี่ยวข้อง]: ข้อความตอบกลับ ->", data.message);
  });

  it("Scenario 7: Validates input length and empty queries", async () => {
    const emptyRes = await ask("");
    expect(emptyRes.status).toBe(400);

    const longQuery = "ก".repeat(501);
    const longRes = await ask(longQuery);
    expect(longRes.status).toBe(400);
    console.log("\n[Test 7 - Input Validation]: ดักจับข้อความว่างและข้อความยาวเกินเรียบร้อย");
  });
});
