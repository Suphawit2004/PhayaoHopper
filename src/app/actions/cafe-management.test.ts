import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ server: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseServer: mocks.server }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { lookupOwner, saveCafe, saveMenu, setMenuAvailability } from "./cafe-management";

const png = Uint8Array.from([137,80,78,71,13,10,26,10, 0,0,0,13, 73,72,68,82, 0,0,0,1, 0,0,0,1, 8,6,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 73,69,78,68, 0,0,0,0]);
const photo = (bytes: Uint8Array, type = "image/png") => new File([Buffer.from(bytes)], "photo.png", { type });

function client(admin: boolean, owner: boolean) {
  const ownership = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({data:owner?{user_id:"user"}:null}) };
  const menu = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({data:{id:"menu"},error:null}) };
  const profiles = { select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{id:"00000000-0000-4000-8000-000000000001",display_name:"Cafe member"},error:null}) };
  const sb={auth:{getUser:vi.fn().mockResolvedValue({data:{user:{id:"user"}}})},rpc:vi.fn().mockResolvedValue({data:admin}),from:vi.fn((table:string)=>table==="cafe_owners"?ownership:table==="profiles"?profiles:menu)};
  mocks.server.mockResolvedValue(sb); return {sb,menu,profiles};
}
describe("menu availability and owner lookup authorization",()=>{
 beforeEach(()=>vi.clearAllMocks());
 it("rejects guest changes before database access",async()=>{
  const {sb,menu}=client(false,false);sb.auth.getUser.mockResolvedValue({data:{user:null}} as never);
  expect(await setMenuAvailability("cafe","menu",false)).toMatchObject({ok:false});
  expect(menu.update).not.toHaveBeenCalled();
 });
 it("rejects another cafe's member",async()=>{
  const {menu}=client(false,false);expect(await setMenuAvailability("cafe","menu",false)).toMatchObject({ok:false});expect(menu.update).not.toHaveBeenCalled();
 });
 it("updates only availability and scopes by both cafe and menu",async()=>{
  const {menu}=client(false,true);expect(await setMenuAvailability("cafe","menu",false)).toMatchObject({ok:true});
  expect(menu.update).toHaveBeenCalledWith({is_available:false});expect(menu.eq).toHaveBeenCalledWith("cafe_slug","cafe");expect(menu.eq).toHaveBeenCalledWith("id","menu");
 });
 it("does not disclose profiles to cafe owners",async()=>{
  const {profiles}=client(false,true);expect(await lookupOwner("cafe","00000000-0000-4000-8000-000000000001")).toEqual({ok:false});expect(profiles.select).not.toHaveBeenCalled();
 });
 it("returns only the verified account ID and display name to admins",async()=>{
  const {profiles}=client(true,false);expect(await lookupOwner("cafe","00000000-0000-4000-8000-000000000001")).toEqual({ok:true,id:"00000000-0000-4000-8000-000000000001",name:"Cafe member"});expect(profiles.select).toHaveBeenCalledWith("id,display_name");
 });
 it("fails closed when the database reports a menu update error",async()=>{
  const {menu}=client(false,true);menu.single.mockResolvedValue({data:null,error:{message:"denied"}} as never);
  expect(await setMenuAvailability("cafe","menu",true)).toMatchObject({ok:false});expect(mocks.revalidate).not.toHaveBeenCalled();
 });
});

describe("cafe and menu image uploads", () => {
 beforeEach(() => vi.clearAllMocks());

 function uploadClient() {
  const owner = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "user" } }) };
  const cafe = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { slug: "cafe", name_th: "Cafe", open_time: "09:00", close_time: "17:00", lat: 19.1, lng: 99.9, area: "city", price_range: 1, base_rating: 0 }, error: null }), update: vi.fn().mockReturnThis() };
  const menu = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "menu" }, error: null }) };
  const storage = { upload: vi.fn().mockResolvedValue({ error: null }), getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.test/photo.png" } }), remove: vi.fn().mockResolvedValue({ error: null }) };
  const sb = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user" } } }) }, rpc: vi.fn().mockResolvedValue({ data: false }), from: vi.fn((table: string) => table === "cafe_owners" ? owner : table === "cafes" ? cafe : menu), storage: { from: vi.fn().mockReturnValue(storage) } };
  mocks.server.mockResolvedValue(sb);
  return { cafe, menu, storage };
 }

 it("rejects a spoofed cafe cover before uploading or saving", async () => {
  const { cafe, storage } = uploadClient();
  const form = new FormData();
  form.set("slug", "cafe"); form.set("name", "Cafe"); form.set("openTime", "09:00"); form.set("closeTime", "17:00"); form.set("priceRange", "1");
  form.set("photo", photo(Uint8Array.from([1, 2, 3])));
  expect(await saveCafe(form)).toMatchObject({ ok: false });
  expect(storage.upload).not.toHaveBeenCalled();
  expect(cafe.update).not.toHaveBeenCalled();
 });

 it("uploads a valid cafe cover and saves its public URL", async () => {
  const { cafe, storage } = uploadClient();
  const form = new FormData();
  form.set("slug", "cafe"); form.set("name", "Cafe"); form.set("openTime", "09:00"); form.set("closeTime", "17:00"); form.set("priceRange", "1");
  form.set("photo", photo(png));
  expect(await saveCafe(form)).toMatchObject({ ok: true });
  expect(storage.upload).toHaveBeenCalledWith(expect.stringMatching(/^cafe\/.+\.png$/), expect.any(File), { contentType: "image/png" });
  expect(cafe.update).toHaveBeenCalledWith(expect.objectContaining({ photo: "https://example.test/photo.png" }));
 });

 it("rejects a mismatched menu photo before uploading or saving", async () => {
  const { menu, storage } = uploadClient();
  const form = new FormData();
  form.set("slug", "cafe"); form.set("name", "Coffee"); form.set("price", "80");
  form.set("photo", photo(png, "image/jpeg"));
  expect(await saveMenu(form)).toMatchObject({ ok: false });
  expect(storage.upload).not.toHaveBeenCalled();
  expect(menu.insert).not.toHaveBeenCalled();
 });

 it("uploads a valid menu photo with its verified type and extension", async () => {
  const { menu, storage } = uploadClient();
  const form = new FormData();
  form.set("slug", "cafe"); form.set("name", "Coffee"); form.set("price", "80");
  form.set("photo", photo(png));
  expect(await saveMenu(form)).toMatchObject({ ok: true });
  expect(storage.upload).toHaveBeenCalledWith(expect.stringMatching(/^cafe\/.+\.png$/), expect.any(File), { contentType: "image/png" });
  expect(menu.insert).toHaveBeenCalled();
 });
});
